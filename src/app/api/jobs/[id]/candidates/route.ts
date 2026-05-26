import { NextRequest, NextResponse } from 'next/server';
import { linkCandidateToJob, unlinkCandidateFromJob } from '@/lib/db';

export async function POST(request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const { id: jobId } = await params;
  const { candidate_id } = await request.json();
  if (!candidate_id) return NextResponse.json({ error: 'candidate_id required' }, { status: 400 });
  const link = linkCandidateToJob(candidate_id, jobId);
  return NextResponse.json(link, { status: 201 });
}

export async function DELETE(request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const { id: jobId } = await params;
  const { candidate_id } = await request.json();
  return unlinkCandidateFromJob(candidate_id, jobId)
    ? NextResponse.json({ success: true })
    : NextResponse.json({ error: 'Not found' }, { status: 404 });
}
