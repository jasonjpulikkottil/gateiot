import { NextRequest, NextResponse } from 'next/server';
import { supabaseService } from '@/lib/supabase';

/**
 * GET /api/logs?date=YYYY-MM-DD&limit=100&offset=0
 *
 * Returns paginated swipe logs joined with employee names.
 * date defaults to today (IST).
 */
export async function GET(req: NextRequest) {
  const { searchParams } = new URL(req.url);
  const limit  = Math.min(Number(searchParams.get('limit')  ?? 100), 500);
  const offset = Number(searchParams.get('offset') ?? 0);

  // Default to today in UTC; Supabase stores in UTC
  const dateParam = searchParams.get('date');
  let rangeStart: string;
  let rangeEnd: string;

  if (dateParam) {
    rangeStart = `${dateParam}T00:00:00.000Z`;
    rangeEnd   = `${dateParam}T23:59:59.999Z`;
  } else {
    const now   = new Date();
    const today = now.toISOString().split('T')[0];
    rangeStart  = `${today}T00:00:00.000Z`;
    rangeEnd    = `${today}T23:59:59.999Z`;
  }

  const db = supabaseService();

  const { data, error, count } = await db
    .from('swipe_logs')
    .select(
      `id, card_uid, swipe_type, temperature, humidity, granted, swiped_at,
       employees ( name, department, shift_start, shift_end )`,
      { count: 'exact' }
    )
    .gte('swiped_at', rangeStart)
    .lte('swiped_at', rangeEnd)
    .order('swiped_at', { ascending: false })
    .range(offset, offset + limit - 1);

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  return NextResponse.json({ data, total: count ?? 0, limit, offset });
}
