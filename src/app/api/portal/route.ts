import { NextRequest, NextResponse } from 'next/server';
import { getCandidateByToken, updateCandidate, logActivity } from '@/lib/db';

export async function GET(request: NextRequest) {
  const token = request.nextUrl.searchParams.get('token');
  if (!token) return NextResponse.json({ error: 'Token required' }, { status: 400 });

  const candidate = getCandidateByToken(token);
  if (!candidate) return NextResponse.json({ error: 'Invalid or expired link' }, { status: 404 });

  const { resume_text: _rt, portal_token: _pt, ...safe } = candidate as unknown as Record<string, unknown>;
  return NextResponse.json(safe);
}

export async function PATCH(request: NextRequest) {
  const token = request.nextUrl.searchParams.get('token');
  if (!token) return NextResponse.json({ error: 'Token required' }, { status: 400 });

  const candidate = getCandidateByToken(token);
  if (!candidate) return NextResponse.json({ error: 'Invalid or expired link' }, { status: 404 });

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
