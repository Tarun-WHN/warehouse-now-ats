import { NextRequest, NextResponse } from 'next/server';
import { addRemark, getRemarks, deleteRemark } from '@/lib/db';

export async function GET(request: NextRequest) {
  const candidateId = request.nextUrl.searchParams.get('candidate_id');
  if (!candidateId) return NextResponse.json({ error: 'candidate_id required' }, { status: 400 });
  const remarks = getRemarks(candidateId);
  return NextResponse.json(remarks);
}

export async function POST(request: NextRequest) {
  const body = await request.json();
  if (!body.candidate_id || !body.author_name || !body.comment) {
    return NextResponse.json({ error: 'candidate_id, author_name, and comment are required' }, { status: 400 });
  }
  const remark = addRemark({
    candidate_id: body.candidate_id,
    author_name: body.author_name,
    author_role: body.author_role || '',
    rating: body.rating || 0,
    comment: body.comment,
    stage: body.stage || '',
  });
  return NextResponse.json(remark, { status: 201 });
}

export async function DELETE(request: NextRequest) {
  const id = request.nextUrl.searchParams.get('id');
  if (!id) return NextResponse.json({ error: 'id required' }, { status: 400 });
  deleteRemark(id);
  return NextResponse.json({ success: true });
}
