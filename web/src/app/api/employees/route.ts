import { NextRequest, NextResponse } from 'next/server';
import { supabaseService } from '@/lib/supabase';
import type { Employee } from '@/lib/types';

/**
 * GET /api/employees — list all employees
 * POST /api/employees — create a new employee / register a new card UID
 */

export async function GET() {
  const db = supabaseService();
  const { data, error } = await db
    .from('employees')
    .select('*')
    .order('name');

  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json({ data });
}

export async function POST(req: NextRequest) {
  let body: Partial<Employee>;
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: 'Invalid JSON' }, { status: 400 });
  }

  const { name, email, department, card_uid, shift_start, shift_end } = body;

  if (!name || !card_uid) {
    return NextResponse.json({ error: 'name and card_uid are required' }, { status: 400 });
  }

  const normUid = card_uid.replace(/[^0-9A-Fa-f]/g, '').toUpperCase();

  const db = supabaseService();
  const { data, error } = await db
    .from('employees')
    .insert({ name, email, department, card_uid: normUid, shift_start, shift_end })
    .select()
    .single();

  if (error) return NextResponse.json({ error: error.message }, { status: 400 });
  return NextResponse.json({ data }, { status: 201 });
}

/**
 * DELETE /api/employees?id=<uuid>
 */
export async function DELETE(req: NextRequest) {
  const id = new URL(req.url).searchParams.get('id');
  if (!id) return NextResponse.json({ error: 'id required' }, { status: 400 });

  const db = supabaseService();
  const { error } = await db.from('employees').delete().eq('id', id);
  if (error) return NextResponse.json({ error: error.message }, { status: 400 });
  return NextResponse.json({ success: true });
}

/**
 * PUT /api/employees — update an existing employee
 */
export async function PUT(req: NextRequest) {
  let body: Partial<Employee> & { id: string };
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: 'Invalid JSON' }, { status: 400 });
  }

  const { id, name, email, department, card_uid, shift_start, shift_end } = body;

  if (!id || !name || !card_uid) {
    return NextResponse.json({ error: 'id, name, and card_uid are required' }, { status: 400 });
  }

  const normUid = card_uid.replace(/[^0-9A-Fa-f]/g, '').toUpperCase();

  const db = supabaseService();
  const { data, error } = await db
    .from('employees')
    .update({ name, email, department, card_uid: normUid, shift_start, shift_end })
    .eq('id', id)
    .select()
    .single();

  if (error) return NextResponse.json({ error: error.message }, { status: 400 });
  return NextResponse.json({ data }, { status: 200 });
}
