import { NextResponse } from 'next/server';
import { supabaseService } from '@/lib/supabase';

/**
 * GET /api/model
 * Returns the latest saved TF.js model weights + metrics from Supabase.
 * Called by the browser dashboard before retraining.
 */
export async function GET() {
  const db = supabaseService();
  const { data, error } = await db
    .from('model_weights')
    .select('*')
    .order('trained_at', { ascending: false })
    .limit(1)
    .single();

  if (error && error.code !== 'PGRST116') {
    // PGRST116 = no rows found — not an error, just means no model saved yet
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  return NextResponse.json({ data: data ?? null });
}
