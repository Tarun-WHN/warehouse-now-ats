import { NextRequest, NextResponse } from 'next/server';
import { getDepartments, addDepartment } from '@/lib/db';

export async function GET() {
  return NextResponse.json(getDepartments());
}

export async function POST(request: NextRequest) {
  const body = await request.json();
  if (!body.name) return NextResponse.json({ error: 'Department name is required' }, { status: 400 });
  try {
    const dept = addDepartment({ ...body, is_active: body.is_active !== false });
    return NextResponse.json(dept, { status: 201 });
  } catch (e: unknown) {
    if (e instanceof Error && e.message.includes('UNIQUE')) {
      return NextResponse.json({ error: 'Department already exists' }, { status: 409 });
    }
    throw e;
  }
}
