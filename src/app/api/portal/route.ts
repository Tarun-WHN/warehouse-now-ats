import { NextRequest, NextResponse } from 'next/server';
import { getCandidateByToken, getCandidate, updateCandidate, logActivity } from '@/lib/db';
import { getSession } from '@/lib/auth';

// Resolve candidate from token or session
async function resolveCandidate(request: NextRequest) {
  const token = request.nextUrl.searchParams.get('token');

  // Try token first
  if (token) {
    const candidate = getCandidateByToken(token);
    if (candidate) return candidate;
  }

  // Fall back to session (for password-based login)
  const session = await getSession();
  if (session && session.type === 'candidate') {
    const candidate = getCandidate(session.id);
    if (candidate) return candidate;
  }

  return null;
}

export async function GET(request: NextRequest) {
  const candidate = await resolveCandidate(request);
  if (!candidate) {
    return NextResponse.json({ error: 'Invalid or expired link' }, { status: 404 });
  }

  const { resume_text: _rt, portal_token: _pt, ...safe } = candidate as unknown as Record<string, unknown>;
  return NextResponse.json(safe);
}

export async function PATCH(request: NextRequest) {
  const candidate = await resolveCandidate(request);
  if (!candidate) {
    return NextResponse.json({ error: 'Invalid or expired link' }, { status: 404 });
  }

  const body = await request.json();

  const allowedFields = [
    'full_name', 'phone', 'email', 'current_location', 'current_employer',
    'current_designation', 'previous_employer', 'previous_designation',
    'date_of_birth', 'preferred_cities', 'hometown', 'notice_period',
    'current_ctc', 'expected_ctc', 'family_background'
  ];

  const updates: Record<string, string> = {};
  for (const f of allowedFields) {
    if (body[f] !== undefined) updates[f] = body[f];
  }

  if (Object.keys(updates).length === 0) {
    return NextResponse.json({ error: 'No valid fields to update' }, { status: 400 });
  }

  const { candidate: updated } = updateCandidate(candidate.id, updates);
  logActivity(candidate.id, 'Self-Service Update', `Candidate updated their profile via portal`, 'Candidate');

  const { resume_text: _rt, portal_token: _pt, ...safe } = (updated || {}) as unknown as Record<string, unknown>;
  return NextResponse.json(safe);
}
