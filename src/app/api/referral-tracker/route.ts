import { NextRequest, NextResponse } from 'next/server';
import { getCandidatesByReferrer } from '@/lib/db';

export async function GET(request: NextRequest) {
  const email = request.nextUrl.searchParams.get('email');
  if (!email) {
    return NextResponse.json({ error: 'Email is required' }, { status: 400 });
  }

  const candidates = getCandidatesByReferrer(email);

  // Return safe subset — referrer should only see limited info
  const safe = candidates.map(c => ({
    id: c.id,
    full_name: c.full_name,
    current_designation: c.current_designation,
    current_location: c.current_location,
    status: c.status,
    date_added: c.date_added,
    status_changed_at: c.status_changed_at,
  }));

  return NextResponse.json({ referrals: safe, count: safe.length });
}
