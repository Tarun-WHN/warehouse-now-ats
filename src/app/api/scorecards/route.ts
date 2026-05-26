import { NextRequest, NextResponse } from 'next/server';
import { getScorecards, addScorecard } from '@/lib/db';

export async function GET(request: NextRequest) {
  const interviewId = request.nextUrl.searchParams.get('interview_id');
  if (!interviewId) return NextResponse.json({ error: 'interview_id required' }, { status: 400 });
  return NextResponse.json(getScorecards(interviewId));
}

export async function POST(request: NextRequest) {
  const body = await request.json();
  if (!body.interview_id) return NextResponse.json({ error: 'interview_id required' }, { status: 400 });
  const sc = addScorecard(body);
  return NextResponse.json(sc, { status: 201 });
}
