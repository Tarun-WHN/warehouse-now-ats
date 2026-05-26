import { NextRequest, NextResponse } from 'next/server';
import { getSession } from '@/lib/auth';
import { verifyPassword, hashPassword } from '@/lib/auth';
import { updateCandidatePassword, updateTeamMemberPassword, getTeamMemberByEmail, getCandidateByEmail, getCandidateByPhone } from '@/lib/db';

export async function POST(request: NextRequest) {
  const session = await getSession();
  if (!session) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  const body = await request.json();
  const { current_password, new_password } = body;

  if (!new_password || new_password.length < 6) {
    return NextResponse.json({ error: 'New password must be at least 6 characters' }, { status: 400 });
  }

  // ─── Admin resetting another user's password ───
  if (body.target_id && body.target_type && session.role === 'Admin') {
    const newHash = hashPassword(new_password);
    let success = false;

    if (body.target_type === 'team') {
      success = updateTeamMemberPassword(body.target_id, newHash);
    } else if (body.target_type === 'candidate') {
      success = updateCandidatePassword(body.target_id, newHash);
    }

    if (!success) {
      return NextResponse.json({ error: 'User not found' }, { status: 404 });
    }

    return NextResponse.json({ message: 'Password reset successfully' });
  }

  // ─── Self password change ───
  if (!current_password) {
    return NextResponse.json({ error: 'Current password is required' }, { status: 400 });
  }

  let storedHash: string | undefined;

  if (session.type === 'team') {
    const member = getTeamMemberByEmail(session.email);
    storedHash = member?.password_hash;
  } else {
    const candidate = getCandidateByEmail(session.email) || getCandidateByPhone(session.email);
    storedHash = candidate?.password_hash;
  }

  if (!storedHash) {
    return NextResponse.json({ error: 'Account not found' }, { status: 404 });
  }

  const valid = verifyPassword(current_password, storedHash);
  if (!valid) {
    return NextResponse.json({ error: 'Current password is incorrect' }, { status: 401 });
  }

  const newHash = hashPassword(new_password);
  let success = false;

  if (session.type === 'team') {
    success = updateTeamMemberPassword(session.id, newHash);
  } else {
    success = updateCandidatePassword(session.id, newHash);
  }

  if (!success) {
    return NextResponse.json({ error: 'Failed to update password' }, { status: 500 });
  }

  return NextResponse.json({ message: 'Password changed successfully' });
}
