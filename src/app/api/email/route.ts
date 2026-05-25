import { NextRequest, NextResponse } from 'next/server';
import { getEmailTemplates, updateEmailTemplate, getCandidate, logActivity } from '@/lib/db';
import { getMissingFields } from '@/lib/parser';

export async function GET() {
  const templates = getEmailTemplates();
  return NextResponse.json(templates);
}

export async function PUT(request: NextRequest) {
  const body = await request.json();
  const updated = updateEmailTemplate(body.id, body);
  return NextResponse.json(updated);
}

export async function POST(request: NextRequest) {
  const body = await request.json();
  const { template_type, candidate_id, custom_data } = body;

  const candidate = getCandidate(candidate_id);
  if (!candidate) {
    return NextResponse.json({ error: 'Candidate not found' }, { status: 404 });
  }

  const templates = getEmailTemplates();
  const template = templates.find(t => t.type === template_type);
  if (!template) {
    return NextResponse.json({ error: 'Template not found' }, { status: 404 });
  }

  let subject = template.subject;
  let emailBody = template.body;

  subject = subject.replace(/\{\{candidate_name\}\}/g, candidate.full_name || 'Candidate');
  emailBody = emailBody.replace(/\{\{candidate_name\}\}/g, candidate.full_name || 'Candidate');

  if (template_type === 'missing_info') {
    const missing = getMissingFields(candidate as unknown as Record<string, string>);
    const missingList = missing.map(f => `  - ${f}`).join('\n');
    emailBody = emailBody.replace('{{missing_fields}}', missingList || 'All fields are complete.');
    emailBody = emailBody.replace('{{profile_link}}', `[Profile Update Link]`);
  }

  if (template_type === 'interest_check') {
    emailBody = emailBody.replace('{{confirm_link}}', `[Interest Confirmation Link]`);
  }

  if (template_type === 'interview_schedule') {
    subject = subject.replace('{{position}}', custom_data?.position || '[Position]');
    emailBody = emailBody.replace('{{position}}', custom_data?.position || '[Position]');
    emailBody = emailBody.replace('{{interview_date}}', custom_data?.date || '[Date]');
    emailBody = emailBody.replace('{{interview_time}}', custom_data?.time || '[Time]');
    emailBody = emailBody.replace('{{interview_mode}}', custom_data?.mode || 'Video Call');
    emailBody = emailBody.replace('{{interviewers}}', custom_data?.interviewers || '[Interviewers]');
  }

  if (template_type === 'vacancy_alert') {
    emailBody = emailBody.replace('{{vacancy_details}}', custom_data?.vacancy || '[Vacancy Details]');
    emailBody = emailBody.replace('{{locations}}', custom_data?.locations || '[Locations]');
    emailBody = emailBody.replace('{{referral_link}}', `[Referral Link]`);
  }

  logActivity(candidate_id, 'Email Prepared', `Template: ${template.name}`, 'Recruiter');

  return NextResponse.json({
    to: candidate.email,
    subject,
    body: emailBody,
    candidate_name: candidate.full_name,
  });
}
