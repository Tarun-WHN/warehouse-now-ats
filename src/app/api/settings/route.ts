import { NextRequest, NextResponse } from 'next/server';
import { getSession } from '@/lib/auth';
import { getSetting, setSetting } from '@/lib/db';

export async function GET() {
  return NextResponse.json({
    ai_parsing_enabled: !!process.env.ANTHROPIC_API_KEY,
    resume_forwarding_address: getSetting('resume_forwarding_address', 'rakesh.dg@warehousenow.in'),
  });
}

export async function POST(request: NextRequest) {
  const session = await getSession();
  if (!session || session.role !== 'Admin') {
    return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
  }
  const body = await request.json();
  if (typeof body.resume_forwarding_address === 'string') {
    const addr = body.resume_forwarding_address.trim();
    if (addr && !/^[^@\s]+@[^@\s]+\.[^@\s]+$/.test(addr)) {
      return NextResponse.json({ error: 'Enter a valid email address.' }, { status: 400 });
    }
    setSetting('resume_forwarding_address', addr);
  }
  return NextResponse.json({
    success: true,
    resume_forwarding_address: getSetting('resume_forwarding_address'),
  });
}
