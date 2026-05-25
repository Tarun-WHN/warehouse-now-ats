import { NextRequest, NextResponse } from 'next/server';
import { getCandidates, insertCandidate, exportCandidatesCSV, getAllSources, getAllLocations } from '@/lib/db';
import { FilterParams } from '@/lib/types';

export async function GET(request: NextRequest) {
  const params = request.nextUrl.searchParams;

  if (params.get('export') === 'csv') {
    const filters: FilterParams = Object.fromEntries(params.entries());
    const csv = exportCandidatesCSV(filters);
    return new NextResponse(csv, {
      headers: {
        'Content-Type': 'text/csv',
        'Content-Disposition': `attachment; filename="candidates-${new Date().toISOString().split('T')[0]}.csv"`,
      },
    });
  }

  if (params.get('meta') === 'filters') {
    return NextResponse.json({
      sources: getAllSources(),
      locations: getAllLocations(),
    });
  }

  const filters: FilterParams = {
    search: params.get('search') || undefined,
    status: params.get('status') || undefined,
    source: params.get('source') || undefined,
    location: params.get('location') || undefined,
    designation: params.get('designation') || undefined,
    min_ctc: params.get('min_ctc') || undefined,
    max_ctc: params.get('max_ctc') || undefined,
    notice_period: params.get('notice_period') || undefined,
    page: params.get('page') ? parseInt(params.get('page')!) : 1,
    per_page: params.get('per_page') ? parseInt(params.get('per_page')!) : 50,
    sort_by: params.get('sort_by') || 'date_added',
    sort_order: (params.get('sort_order') as 'asc' | 'desc') || 'desc',
  };

  const result = getCandidates(filters);
  return NextResponse.json(result);
}

export async function POST(request: NextRequest) {
  const body = await request.json();

  if (Array.isArray(body)) {
    const results = body.map(candidate =>
      insertCandidate({
        ...candidate,
        date_added: candidate.date_added || new Date().toISOString(),
        status: candidate.status || 'New',
      })
    );
    return NextResponse.json({ inserted: results.length, candidates: results });
  }

  const candidate = insertCandidate({
    ...body,
    date_added: body.date_added || new Date().toISOString(),
    status: body.status || 'New',
  });

  return NextResponse.json(candidate, { status: 201 });
}
