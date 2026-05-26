import { NextRequest, NextResponse } from 'next/server';
import { getTeamMemberByEmail, getCandidateByToken } from '@/lib/db';
import { verifyPassword, createSession } from '@/lib/auth';

export async function POST(request: NextRequest) {
  const body = await request.json();
  const { email, password, portal_token } = body;

  // ─── Candidate login via portal token ───
  if (portal_token) {
    const candidate = getCandidateByToken(portal_token);
    if (!candidate) {
      return NextResponse.json({ error: 'Invalid access token' }, { status: 401 });
    }

    await createSession({
      id: candidate.id,
      email: candidate.email || '',
      name: candidate.full_name || 'Candidate',
      role: 'Candidate',
      type: 'candidate',
    });

    return NextResponse.json({
      user: {
        id: candidate.id,
        name: candidate.full_name,
        email: candidate.email,
        role: 'Candidate',
        type: 'candidate',
      },
    });
  }

  // ─── Team member login via email + password ───
  if (!email || !password) {
    return NextResponse.json({ error: 'Email and password are required' }, { status: 400 });
  }

  const member = getTeamMemberByEmail(email.toLowerCase().trim());
  if (!member) {
    return NextResponse.json({ error: 'Invalid email or password' }, { status: 401 });
  }

  if (!member.is_active) {
    return NextResponse.json({ error: 'Account is deactivated. Contact your admin.' }, { status: 403 });
  }

  if (!member.password_hash) {
    return NextResponse.json({ error: 'No password set. Contact your admin to reset.' }, { status: 401 });
  }

  const valid = verifyPassword(password, member.password_hash);
  if (!valid) {
    return NextResponse.json({ error: 'Invalid email or password' }, { status: 401 });
  }

  await createSession({
    id: member.id,
    email: member.email,
    name: member.name,
    role: member.role,
    type: 'team',
  });

  return NextResponse.json({
    user: {
      id: member.id,
      name: member.name,
      email: member.email,
      role: member.role,
      type: 'team',
      department: member.department,
    },
  });
}
