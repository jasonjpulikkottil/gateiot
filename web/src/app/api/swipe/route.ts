import { NextRequest, NextResponse } from 'next/server';
import { supabaseService } from '@/lib/supabase';
import type { SwipeRequest, SwipeResponse } from '@/lib/types';

/**
 * POST /api/swipe
 *
 * Receives a JSON payload from the local Python gateway script:
 *   { "uid": "6E8A2407", "temp": 28.5, "hum": 65.2 }
 *
 * Business rules:
 *  1. Look up employee by card_uid (case-insensitive, normalised)
 *  2. Count today's GRANTED swipes for that employee
 *  3. If count >= 2 → DENY (daily limit exceeded)
 *  4. If count = 0 → ENTRY, if count = 1 → EXIT
 *  5. Unknown card → DENY (unknown_card)
 *
 * Response is read by the Python gateway to send GRANT/DENY over serial.
 */
export async function POST(req: NextRequest) {
  let body: SwipeRequest;

  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ granted: false, reason: 'server_error' }, { status: 400 });
  }

  const { uid, temp, hum } = body;

  if (!uid || typeof uid !== 'string') {
    return NextResponse.json({ granted: false, reason: 'server_error' }, { status: 400 });
  }

  // Normalise UID: uppercase, strip non-hex chars
  const normUid = uid.replace(/[^0-9A-Fa-f]/g, '').toUpperCase();
  const db = supabaseService();

  // 1. Look up employee
  const { data: employee, error: empError } = await db
    .from('employees')
    .select('id, name, department')
    .eq('card_uid', normUid)
    .single();

  if (empError || !employee) {
    // Unknown card — log and deny
    await db.from('swipe_logs').insert({
      card_uid: normUid,
      swipe_type: 'unknown',
      temperature: temp ?? null,
      humidity: hum ?? null,
      granted: false,
    });

    const res: SwipeResponse = { granted: false, reason: 'unknown_card' };
    return NextResponse.json(res, { status: 200 });
  }

  // 2. Count today's granted swipes for this employee
  const todayStart = new Date();
  todayStart.setHours(0, 0, 0, 0);

  const { count, error: countError } = await db
    .from('swipe_logs')
    .select('*', { count: 'exact', head: true })
    .eq('employee_id', employee.id)
    .eq('granted', true)
    .gte('swiped_at', todayStart.toISOString());

  if (countError) {
    return NextResponse.json({ granted: false, reason: 'server_error' } as SwipeResponse, { status: 500 });
  }

  const swipeCount = count ?? 0;

  // 3. Time window restrictions check (Entry: 0 swipes, Exit: 1 swipe)
  if (swipeCount === 0 || swipeCount === 1) {
    // Fetch time limits and timezone from app_settings
    const { data: settingsData } = await db.from('app_settings').select('key, value');
    const settings = (settingsData || []).reduce((acc: Record<string, string>, item) => {
      acc[item.key] = item.value;
      return acc;
    }, {});

    const entryStart = settings.entry_start || '08:00';
    const entryEnd = settings.entry_end || '10:00';
    const exitStart = settings.exit_start || '15:00';
    const exitEnd = settings.exit_end || '17:00';
    const timezone = settings.timezone || 'Asia/Kolkata';

    let currentHour = 0;
    let currentMin = 0;
    try {
      const localTimeString = new Date().toLocaleTimeString('en-US', {
        timeZone: timezone,
        hour12: false,
      });
      const parts = localTimeString.split(':').map(Number);
      currentHour = parts[0];
      currentMin = parts[1];
    } catch {
      const now = new Date();
      currentHour = now.getUTCHours();
      currentMin = now.getUTCMinutes();
    }

    const currentMinutes = currentHour * 60 + currentMin;

    const parseToMinutes = (timeStr: string) => {
      const [h, m] = timeStr.split(':').map(Number);
      return h * 60 + m;
    };

    if (swipeCount === 0) {
      // Check Entry window
      const entryStartMin = parseToMinutes(entryStart);
      const entryEndMin = parseToMinutes(entryEnd);
      if (currentMinutes < entryStartMin || currentMinutes > entryEndMin) {
        await db.from('swipe_logs').insert({
          employee_id: employee.id,
          card_uid: normUid,
          swipe_type: 'denied',
          temperature: temp ?? null,
          humidity: hum ?? null,
          granted: false,
        });

        const res: SwipeResponse = {
          granted: false,
          reason: 'invalid_entry_time',
          name: employee.name,
          swipe_count: swipeCount,
        };
        return NextResponse.json(res, { status: 200 });
      }
    } else {
      // Check Exit window
      const exitStartMin = parseToMinutes(exitStart);
      const exitEndMin = parseToMinutes(exitEnd);
      if (currentMinutes < exitStartMin || currentMinutes > exitEndMin) {
        await db.from('swipe_logs').insert({
          employee_id: employee.id,
          card_uid: normUid,
          swipe_type: 'denied',
          temperature: temp ?? null,
          humidity: hum ?? null,
          granted: false,
        });

        const res: SwipeResponse = {
          granted: false,
          reason: 'invalid_exit_time',
          name: employee.name,
          swipe_count: swipeCount,
        };
        return NextResponse.json(res, { status: 200 });
      }
    }
  }

  // 4. Daily limit check (2 granted swipes per day: 1 entry + 1 exit)
  if (swipeCount >= 2) {
    await db.from('swipe_logs').insert({
      employee_id: employee.id,
      card_uid: normUid,
      swipe_type: 'denied',
      temperature: temp ?? null,
      humidity: hum ?? null,
      granted: false,
    });

    const res: SwipeResponse = {
      granted: false,
      reason: 'daily_limit',
      name: employee.name,
      swipe_count: swipeCount,
    };
    return NextResponse.json(res, { status: 200 });
  }

  // 4. Grant access — alternate entry/exit
  const swipeType: 'entry' | 'exit' = swipeCount === 0 ? 'entry' : 'exit';

  await db.from('swipe_logs').insert({
    employee_id: employee.id,
    card_uid: normUid,
    swipe_type: swipeType,
    temperature: temp ?? null,
    humidity: hum ?? null,
    granted: true,
  });

  const res: SwipeResponse = {
    granted: true,
    type: swipeType,
    name: employee.name,
    department: employee.department,
    swipe_count: swipeCount + 1,
  };
  return NextResponse.json(res, { status: 200 });
}
