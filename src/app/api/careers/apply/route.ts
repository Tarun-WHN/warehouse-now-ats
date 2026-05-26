import { NextRequest, NextResponse } from 'next/server';
import { insertCandidate, linkCandidateToJob } from '@/lib/db';

export async function POST(request: NextRequest) {
  const body = await request.json();
  if (!body.full_name && !body.email && !body.phone) {
    return NextResponse.json({ error: 'At least name, email, or phone required' }, { status: 400 });
  }

  const candidate = insertCandidate({
    full_name: body.full_name || '',
    phone: body.phone || '',
    email: body.email || '',
    current_location: body.current_location || '',
    current_employer: body.current_employer || '',
    current_designation: body.current_designation || '',
    previous_employer: '',
    previous_designation: '',
    date_of_birth: '',
    preferred_cities: '',
    hometown: '',
    notice_period: body.notice_period || '',
    current_ctc: body.current_ctc || '',
    expected_ctc: body.expected_ctc || '',
    family_background: '',
    source: 'Career Page',
    resume_file: '',
    resume_filename: '',
    date_added: new Date().toISOString(),
    status: 'New',
    referrer_name: '',
    referrer_email: '',
    notes: '',
    department_id: '',
    job_id: body.job_id || '',
  });

  if (body.job_id) {
    linkCandidateToJob(candidate.id, body.job_id);
  }

  return NextResponse.json({ success: true, candidate_id: candidate.id, portal_token: candidate.portal_token }, { status: 201 });
}
