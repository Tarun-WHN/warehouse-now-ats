import { NextRequest, NextResponse } from 'next/server';
import { bulkUpdateCandidateStatus, getCandidate, getEmailTemplate, logActivity, deleteCandidate } from '@/lib/db';
import { sendEmail, renderTemplate, isEmailConfigured } from '@/lib/mailer';

export async function POST(request: NextRequest) {
  const { action, candidate_ids, data } = await request.json();

  if (!candidate_ids || !Array.isArray(candidate_ids) || candidate_ids.length === 0) {
    return NextResponse.json({ error: 'candidate_ids array required' }, { status: 400 });
  }

  if (action === 'delete') {
    let deleted = 0;
    for (const id of candidate_ids) {
      if (deleteCandidate(id)) deleted++;
    }
    return NextResponse.json({ processed: candidate_ids.length, deleted });
  }

  if (action === 'status_change') {
    if (!data?.status) return NextResponse.json({ error: 'data.status required' }, { status: 400 });
    const changed = bulkUpdateCandidateStatus(candidate_ids, data.status);
    return NextResponse.json({ processed: candidate_ids.length, changed });
  }

  if (action === 'send_email') {
    if (!data?.template_id) return NextResponse.json({ error: 'data.template_id required' }, { status: 400 });
    if (!isEmailConfigured()) return NextResponse.json({ error: 'SMTP not configured' }, { status: 400 });

    const template = getEmailTemplate(data.template_id);
    if (!template) return NextResponse.json({ error: 'Template not found' }, { status: 404 });

    let sent = 0;
    let failed = 0;
    for (const id of candidate_ids) {
      const c = getCandidate(id);
      if (!c || !c.email) { failed++; continue; }
      const vars: Record<string, string> = {
        candidate_name: c.full_name, email: c.email, phone: c.phone,
        position: c.current_designation, location: c.current_location,
      };
      const subject = renderTemplate(template.subject, vars);
      const body = renderTemplate(template.body, vars);
      const result = await sendEmail(c.email, subject, body);
      if (result.success) {
        sent++;
        logActivity(id, 'Email Sent', `Template: ${template.name}`, 'System');
      } else {
        failed++;
      }
    }
    return NextResponse.json({ processed: candidate_ids.length, sent, failed });
  }

  return NextResponse.json({ error: 'Invalid action. Use: status_change, send_email, delete' }, { status: 400 });
}
