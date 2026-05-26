import { NextRequest, NextResponse } from 'next/server';
import { getCandidate, updateCandidate, deleteCandidate, getActivityLog, getActiveRulesForTransition, logActivity, getCandidateJobs } from '@/lib/db';
import { sendEmail, renderTemplate, isEmailConfigured } from '@/lib/mailer';

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;
  const sp = request.nextUrl.searchParams;

  if (sp.get('activity') === 'true') {
    return NextResponse.json(getActivityLog(id));
  }
  if (sp.get('jobs') === 'true') {
    return NextResponse.json(getCandidateJobs(id));
  }

  const candidate = getCandidate(id);
  if (!candidate) return NextResponse.json({ error: 'Candidate not found' }, { status: 404 });
  return NextResponse.json(candidate);
}

export async function PATCH(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;
  const body = await request.json();
  const { candidate: updated, statusChanged } = updateCandidate(id, body);
  if (!updated) return NextResponse.json({ error: 'Candidate not found' }, { status: 404 });

  // Workflow automation: auto-send email on status change
  if (statusChanged && isEmailConfigured() && updated.email) {
    const rules = getActiveRulesForTransition(statusChanged.from, statusChanged.to);
    for (const rule of rules) {
      if (rule.template_subject && rule.template_body) {
        const vars: Record<string, string> = {
          candidate_name: updated.full_name, email: updated.email,
          phone: updated.phone, position: updated.current_designation,
          location: updated.current_location,
        };
        const subject = renderTemplate(rule.template_subject, vars);
        const emailBody = renderTemplate(rule.template_body, vars);
        const result = await sendEmail(updated.email, subject, emailBody);
        if (result.success) {
          logActivity(id, 'Auto Email Sent', `Workflow: ${statusChanged.from} → ${statusChanged.to}, Template: ${rule.template_name}`);
        }
      }
    }
  }

  return NextResponse.json(updated);
}

export async function DELETE(
  _request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;
  return deleteCandidate(id)
    ? NextResponse.json({ success: true })
    : NextResponse.json({ error: 'Candidate not found' }, { status: 404 });
}
