import { NextResponse } from 'next/server';
import { getSession } from '@/lib/auth';
import { runBackup, listBackups } from '@/lib/backup';

// GET: list existing snapshots (Admin only)
export async function GET() {
  const session = await getSession();
  if (!session || session.role !== 'Admin') {
    return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
  }
  return NextResponse.json({ backups: listBackups() });
}

// POST: trigger a manual snapshot now (Admin only)
export async function POST() {
  const session = await getSession();
  if (!session || session.role !== 'Admin') {
    return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
  }
  try {
    const file = await runBackup();
    return NextResponse.json({ success: true, file, backups: listBackups() });
  } catch (e) {
    return NextResponse.json({ error: (e as Error).message }, { status: 500 });
  }
}
