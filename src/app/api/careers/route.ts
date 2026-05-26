import { NextResponse } from 'next/server';
import { getOpenJobs } from '@/lib/db';

export async function GET() {
  const jobs = getOpenJobs();
  return NextResponse.json(jobs);
}
