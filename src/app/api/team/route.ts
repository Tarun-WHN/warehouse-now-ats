import { NextRequest, NextResponse } from 'next/server';
import { getTeamMembers, addTeamMember } from '@/lib/db';
import { hashPassword } from '@/lib/auth';

export async function GET() {
  const members = getTeamMembers();
  return NextResponse.json(members);
}

export async function POST(request: NextRequest) {
  const body = await request.json();
  if (!body.name || !body.email || !body.role) {
    return NextResponse.json({ error: 'Name, email, and role are required' }, { status: 400 });
  }

  // Hash password if provided, otherwise generate a default one
  const password = body.password || 'welcome123';
  const password_hash = hashPassword(password);

  try {
    const member = addTeamMember({
      ...body,
      is_active: body.is_active !== false,
      password_hash,
    });
    return NextResponse.json({ ...member, default_password: body.password ? undefined : 'welcome123' }, { status: 201 });
  } catch (e: unknown) {
    const msg = e instanceof Error ? e.message : '';
    if (msg.includes('UNIQUE')) {
      return NextResponse.json({ error: 'A team member with this email already exists' }, { status: 409 });
    }
    throw e;
  }
}
