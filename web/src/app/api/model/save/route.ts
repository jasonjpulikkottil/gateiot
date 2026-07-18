import { NextRequest, NextResponse } from 'next/server';
import { supabaseService } from '@/lib/supabase';

/**
 * POST /api/model/save
 * Called by the browser ModelTrainer component after retraining.
 * Body: { weights: <TF.js serialised LayersModel>, metrics: { loss, accuracy, epochs, ... }, trained_by: string }
 * Inserts a new version row; historical weights are preserved.
 */
export async function POST(req: NextRequest) {
  let body: { weights: object; metrics?: object; trained_by?: string };
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: 'Invalid JSON' }, { status: 400 });
  }

  const { weights, metrics, trained_by } = body;
  if (!weights) {
    return NextResponse.json({ error: 'weights are required' }, { status: 400 });
  }

  const db = supabaseService();

  // Get current max version
  const { data: latest } = await db
    .from('model_weights')
    .select('version')
    .order('version', { ascending: false })
    .limit(1)
    .single();

  const nextVersion = (latest?.version ?? 0) + 1;

  const { data, error } = await db
    .from('model_weights')
    .insert({ version: nextVersion, weights, metrics: metrics ?? null, trained_by: trained_by ?? null })
    .select()
    .single();

  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json({ data }, { status: 201 });
}
