import { NextRequest, NextResponse } from 'next/server';
import { getCandidate, updateCandidate, deleteCandidate, getActivityLog } from '@/lib/db';

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;
  const activity = request.nextUrl.searchParams.get('activity');

  if (activity === 'true') {
    const log = getActivityLog(id);
    return NextResponse.json(log);
  }

  const candidate = getCandidate(id);
  if (!candidate) {
    return NextResponse.json({ error: 'Candidate not found' }, { status: 404 });
  }
  return NextResponse.json(candidate);
}

export async function PATCH(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;
  const body = await request.json();
  const updated = updateCandidate(id, body);
  if (!updated) {
    return NextResponse.json({ error: 'Candidate not found' }, { status: 404 });
  }
  return NextResponse.json(updated);
}

export async function DELETE(
  _request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;
  const deleted = deleteCandidate(id);
  if (!deleted) {
    return NextResponse.json({ error: 'Candidate not found' }, { status: 404 });
  }
  return NextResponse.json({ success: true });
}
