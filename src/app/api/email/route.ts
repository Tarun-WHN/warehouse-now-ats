import { NextRequest, NextResponse } from 'next/server';
import { getEmailTemplates, updateEmailTemplate, addEmailTemplate, deleteEmailTemplate, getCandidate, logActivity } from '@/lib/db';
import { getMissingFields } from '@/lib/parser';
import { sendEmail, renderTemplate, isEmailConfigured } from '@/lib/mailer';

export async function GET() {
  const templates = getEmailTemplates();
  return NextResponse.json({ templates, smtp_configured: isEmailConfigured() });
}

export async function PUT(request: NextRequest) {
  const body = await request.json();
  if (body.action === 'create') {
    const template = addEmailTemplate(body);
    return NextResponse.json(template, { status: 201 });
  }
  if (body.action === 'delete') {
    deleteEmailTemplate(body.id);
    return NextResponse.json({ success: true });
  }
  const updated = updateEmailTemplate(body.id, body);
  return NextResponse.json(updated);
}

export async function POST(request: NextRequest) {
  const body = await request.json();
  const { template_type, template_id, candidate_id, custom_data, send } = body;

  const candidate = getCandidate(candidate_id);
  if (!candidate) return NextResponse.json({ error: 'Candidate not found' }, { status: 404 });

  const templates = getEmailTemplates();
  const template = template_id
    ? templates.find(t => t.id === template_id)
    : templates.find(t => t.type === template_type);
  if (!template) return NextResponse.json({ error: 'Template not found' }, { status: 404 });

  const vars: Record<string, string> = {
    candidate_name: candidate.full_name || 'Candidate',
    email: candidate.email || '',
    phone: candidate.phone || '',
    position: candidate.current_designation || custom_data?.position || '[Position]',
    location: candidate.current_location || '',
    interview_date: custom_data?.date || '[Date]',
    interview_time: custom_data?.time || '[Time]',
    interview_mode: custom_data?.mode || 'Video Call',
    interviewers: custom_data?.interviewers || '[Interviewers]',
    profile_link: candidate.portal_token ? `${custom_data?.origin || ''}/portal?token=${candidate.portal_token}` : '[Profile Link]',
    confirm_link: '[Interest Confirmation Link]',
    referral_link: `${custom_data?.origin || ''}/referral`,
    portal_link: candidate.portal_token ? `${custom_data?.origin || ''}/portal?token=${candidate.portal_token}` : '[Portal Link]',
    vacancy_details: custom_data?.vacancy || '[Vacancy Details]',
    locations: custom_data?.locations || '[Locations]',
    department: custom_data?.department || '',
    offered_ctc: custom_data?.offered_ctc || '',
    joining_date: custom_data?.joining_date || '',
  };

  if (template.type === 'missing_info') {
    const missing = getMissingFields(candidate as unknown as Record<string, string>);
    vars.missing_fields = missing.map(f => `  - ${f}`).join('\n') || 'All fields are complete.';
  }

  const subject = renderTemplate(template.subject, vars);
  const emailBody = renderTemplate(template.body, vars);

  let sent = false;
  let sendError = '';

  if (send && isEmailConfigured() && candidate.email) {
    const result = await sendEmail(candidate.email, subject, emailBody);
    sent = result.success;
    sendError = result.error || '';
    if (sent) {
      logActivity(candidate_id, 'Email Sent', `Template: ${template.name} to ${candidate.email}`, 'Recruiter');
    }
  } else {
    logActivity(candidate_id, 'Email Prepared', `Template: ${template.name}`, 'Recruiter');
  }

  return NextResponse.json({
    to: candidate.email,
    subject,
    body: emailBody,
    candidate_name: candidate.full_name,
    sent,
    send_error: sendError,
    smtp_configured: isEmailConfigured(),
  });
}
