import { NextRequest, NextResponse } from 'next/server';
import { updateTeamMember, deleteTeamMember } from '@/lib/db';
import { hashPassword } from '@/lib/auth';

export async function PATCH(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;
  const body = await request.json();

  // If password is being set/changed, hash it
  if (body.password) {
    body.password_hash = hashPassword(body.password);
    delete body.password;
  }

  const updated = updateTeamMember(id, body);
  if (!updated) return NextResponse.json({ error: 'Not found' }, { status: 404 });
  return NextResponse.json(updated);
}

export async function DELETE(
  _request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;
  const deleted = deleteTeamMember(id);
  if (!deleted) return NextResponse.json({ error: 'Not found' }, { status: 404 });
  return NextResponse.json({ success: true });
}
