import { NextResponse } from 'next/server';
import { getSession } from '@/lib/auth';
import { pollInboxOnce, isEmailIngestConfigured } from '@/lib/email-ingest';

// GET: report whether inbound resume ingestion is configured (Admin only).
export async function GET() {
  const session = await getSession();
  if (!session || session.role !== 'Admin') {
    return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
  }
  return NextResponse.json({ configured: isEmailIngestConfigured() });
}

// POST: trigger an inbox poll right now (Admin only).
export async function POST() {
  const session = await getSession();
  if (!session || session.role !== 'Admin') {
    return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
  }
  if (!isEmailIngestConfigured()) {
    return NextResponse.json(
      { error: 'Email ingest not configured. Set SMTP_USER and SMTP_PASS (Google App Password) in the environment.' },
      { status: 400 },
    );
  }
  try {
    const result = await pollInboxOnce();
    return NextResponse.json({ success: true, ...result });
  } catch (e) {
    return NextResponse.json({ error: (e as Error).message }, { status: 500 });
  }
}
