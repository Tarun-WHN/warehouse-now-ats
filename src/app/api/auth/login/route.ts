import { NextRequest, NextResponse } from 'next/server';
import { getTeamMemberByEmail, getCandidateByToken, getCandidateByEmail, getCandidateByPhone } from '@/lib/db';
import { verifyPassword, createSession } from '@/lib/auth';

export async function POST(request: NextRequest) {
  const body = await request.json();
  const { email, password, portal_token, login_type } = body;

  // ─── Candidate login via portal token (legacy/fallback) ───
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
        portal_token: candidate.portal_token,
      },
    });
  }

  if (!email || !password) {
    return NextResponse.json({ error: 'Email/phone and password are required' }, { status: 400 });
  }

  const loginId = email.trim().toLowerCase();

  // ─── Candidate login via email/phone + password ───
  if (login_type === 'candidate') {
    // Try email first, then phone
    const candidate = getCandidateByEmail(loginId) || getCandidateByPhone(loginId);

    if (!candidate) {
      return NextResponse.json({ error: 'No account found with this email/phone' }, { status: 401 });
    }

    if (!candidate.password_hash) {
      return NextResponse.json({ error: 'No password set. Contact the recruiter or use your portal token.' }, { status: 401 });
    }

    const valid = verifyPassword(password, candidate.password_hash);
    if (!valid) {
      return NextResponse.json({ error: 'Invalid email/phone or password' }, { status: 401 });
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
        portal_token: candidate.portal_token,
      },
    });
  }

  // ─── Team member login via email + password ───
  const member = getTeamMemberByEmail(loginId);
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
