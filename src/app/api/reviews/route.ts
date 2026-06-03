import { NextRequest, NextResponse } from 'next/server';
import { getAllRemarks } from '@/lib/db';

// GET: all screening/interview feedback (remarks) across candidates, with the
// reviewer name, stage, outcome and comments. Powers the Reviews tab.
export async function GET(request: NextRequest) {
  const sp = request.nextUrl.searchParams;
  const reviews = getAllRemarks({
    outcome: sp.get('outcome') || undefined,
    stage: sp.get('stage') || undefined,
    search: sp.get('search') || undefined,
  });
  return NextResponse.json(reviews);
}
