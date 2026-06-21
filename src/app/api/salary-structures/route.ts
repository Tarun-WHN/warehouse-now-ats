import { NextRequest, NextResponse } from 'next/server';
import { getSession } from '@/lib/auth';
import { getSalaryStructures, addSalaryStructure } from '@/lib/db';

async function requireAdmin() {
  const session = await getSession();
  return !!session && session.role === 'Admin';
}

export async function GET() {
  if (!(await requireAdmin())) return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
  return NextResponse.json(getSalaryStructures());
}

export async function POST(request: NextRequest) {
  if (!(await requireAdmin())) return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
  const body = await request.json();
  if (!body.name || !body.structure) {
    return NextResponse.json({ error: 'Name and structure are required' }, { status: 400 });
  }
  return NextResponse.json(addSalaryStructure(String(body.name).trim(), body.structure), { status: 201 });
}
