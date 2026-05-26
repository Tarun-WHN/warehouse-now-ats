import { NextRequest, NextResponse } from 'next/server';
import { getJobs, addJob } from '@/lib/db';

export async function GET(request: NextRequest) {
  const sp = request.nextUrl.searchParams;
  const jobs = getJobs({
    status: sp.get('status') || undefined,
    department_id: sp.get('department_id') || undefined,
    search: sp.get('search') || undefined,
  });
  return NextResponse.json(jobs);
}

export async function POST(request: NextRequest) {
  const body = await request.json();
  if (!body.title) return NextResponse.json({ error: 'Job title is required' }, { status: 400 });
  const job = addJob(body);
  return NextResponse.json(job, { status: 201 });
}
