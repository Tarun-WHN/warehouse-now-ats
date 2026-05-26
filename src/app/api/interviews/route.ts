import { NextRequest, NextResponse } from 'next/server';
import { getInterviews, addInterview } from '@/lib/db';

export async function GET(request: NextRequest) {
  const sp = request.nextUrl.searchParams;
  const interviews = getInterviews({
    candidate_id: sp.get('candidate_id') || undefined,
    job_id: sp.get('job_id') || undefined,
    status: sp.get('status') || undefined,
    upcoming: sp.get('upcoming') === 'true',
  });
  return NextResponse.json(interviews);
}

export async function POST(request: NextRequest) {
  const body = await request.json();
  if (!body.candidate_id || !body.scheduled_at) {
    return NextResponse.json({ error: 'candidate_id and scheduled_at are required' }, { status: 400 });
  }
  const interview = addInterview(body);
  return NextResponse.json(interview, { status: 201 });
}
