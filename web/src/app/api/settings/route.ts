import { NextRequest, NextResponse } from 'next/server';
import { supabaseService } from '@/lib/supabase';

/**
 * GET /api/settings
 *
 * Retrieves current gate time restrictions and timezone settings.
 */
export async function GET() {
  const db = supabaseService();
  const { data, error } = await db.from('app_settings').select('key, value');

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  const settings = (data || []).reduce((acc: Record<string, string>, item) => {
    acc[item.key] = item.value;
    return acc;
  }, {});

  const result = {
    entry_start: settings.entry_start || '08:00',
    entry_end: settings.entry_end || '10:00',
    exit_start: settings.exit_start || '15:00',
    exit_end: settings.exit_end || '17:00',
    timezone: settings.timezone || 'Asia/Kolkata',
  };

  return NextResponse.json(result);
}

/**
 * POST /api/settings
 *
 * Updates gate time restrictions and timezone settings in DB.
 */
export async function POST(req: NextRequest) {
  let body;
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: 'Invalid JSON body' }, { status: 400 });
  }

  const { entry_start, entry_end, exit_start, exit_end, timezone } = body;

  const db = supabaseService();

  const updates = [
    { key: 'entry_start', value: entry_start || '08:00' },
    { key: 'entry_end', value: entry_end || '10:00' },
    { key: 'exit_start', value: exit_start || '15:00' },
    { key: 'exit_end', value: exit_end || '17:00' },
    { key: 'timezone', value: timezone || 'Asia/Kolkata' },
  ];

  const { error } = await db.from('app_settings').upsert(updates, { onConflict: 'key' });

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  return NextResponse.json({ success: true });
}
