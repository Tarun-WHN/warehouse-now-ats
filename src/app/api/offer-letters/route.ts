import { NextRequest, NextResponse } from 'next/server';
import path from 'path';
import fs from 'fs/promises';
import { getSession } from '@/lib/auth';
import { getOfferTemplate, getOfferLetters, addOfferLetter, DATA_DIR } from '@/lib/db';
import { fillDocx, docxToHtml, offerFileName, OfferDocError } from '@/lib/offer-docx';
import { sendEmail, isEmailConfigured } from '@/lib/mailer';
import type { OfferLetterFields } from '@/lib/types';

const OFFER_DIR = path.join(DATA_DIR, 'offer-templates');

async function requireAdmin() {
  const session = await getSession();
  if (!session || session.role !== 'Admin') return null;
  return session;
}

export async function GET() {
  if (!(await requireAdmin())) return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
  return NextResponse.json(getOfferLetters());
}

export async function POST(request: NextRequest) {
  const session = await requireAdmin();
  if (!session) return NextResponse.json({ error: 'Forbidden' }, { status: 403 });

  const body = await request.json();
  const { template_id, action } = body as { template_id: string; action: 'preview' | 'download' | 'email' };
  const fields = (body.fields || {}) as OfferLetterFields;

  if (!template_id) return NextResponse.json({ error: 'Select a template' }, { status: 400 });

  const tpl = getOfferTemplate(template_id);
  if (!tpl) return NextResponse.json({ error: 'Template not found' }, { status: 404 });
  if (!tpl.file_path) {
    return NextResponse.json({ error: 'This template has no uploaded Word file. Upload a .docx format first.' }, { status: 400 });
  }

  let templateBuffer: Buffer;
  try {
    templateBuffer = await fs.readFile(path.join(OFFER_DIR, tpl.file_path));
  } catch {
    return NextResponse.json({ error: 'The template file is missing on the server. Re-upload it.' }, { status: 404 });
  }

  // Preview → fill + convert to HTML for the on-screen / print view
  if (action === 'preview') {
    try {
      const filled = fillDocx(templateBuffer, fields);
      const html = await docxToHtml(filled);
      return NextResponse.json({ html });
    } catch (e) {
      const msg = e instanceof OfferDocError ? e.message : 'Failed to render preview';
      return NextResponse.json({ error: msg }, { status: 400 });
    }
  }

  // Download → return the filled .docx and save a draft record
  if (action === 'download') {
    try {
      const filled = fillDocx(templateBuffer, fields);
      addOfferLetter({
        template_id, candidate_id: body.candidate_id, employee_name: fields.employee_name || '',
        fields, status: 'draft', created_by: session.id,
      });
      return new NextResponse(new Uint8Array(filled), {
        headers: {
          'Content-Type': 'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
          'Content-Disposition': `attachment; filename="${offerFileName(fields.employee_name, 'docx')}"`,
        },
      });
    } catch (e) {
      const msg = e instanceof OfferDocError ? e.message : 'Failed to generate document';
      return NextResponse.json({ error: msg }, { status: 400 });
    }
  }

  // Email → send the offer letter to the candidate with a cover-letter note
  if (action === 'email') {
    const to = (body.email as string || '').trim();
    const coverLetter = (body.cover_letter as string || '').trim();
    if (!to) return NextResponse.json({ error: 'Recipient email is required' }, { status: 400 });
    if (!isEmailConfigured()) return NextResponse.json({ error: 'Email is not configured (SMTP env vars missing).' }, { status: 400 });

    let filled: Buffer;
    try {
      filled = fillDocx(templateBuffer, fields);
    } catch (e) {
      const msg = e instanceof OfferDocError ? e.message : 'Failed to generate document';
      return NextResponse.json({ error: msg }, { status: 400 });
    }

    const subject = body.subject || `Offer Letter — ${fields.employee_name || 'Warehouse Now'}`;
    const defaultCover = `Dear ${fields.employee_name || 'Candidate'},\n\nPlease find attached your offer letter from Warehouse Now. We are excited to have you join us${fields.designation ? ` as ${fields.designation}` : ''}.\n\nKindly review the attached document and reply to confirm your acceptance.\n\nWarm regards,\nWarehouse Now HR`;

    const result = await sendEmail(
      to,
      subject,
      coverLetter || defaultCover,
      [{ filename: offerFileName(fields.employee_name, 'docx'), content: filled }],
    );
    if (!result.success) return NextResponse.json({ error: result.error || 'Failed to send email' }, { status: 500 });

    const record = addOfferLetter({
      template_id, candidate_id: body.candidate_id, employee_name: fields.employee_name || '',
      fields, status: 'sent', sent_to: to, created_by: session.id,
    });
    return NextResponse.json({ success: true, offer_letter: record });
  }

  return NextResponse.json({ error: 'Unknown action' }, { status: 400 });
}
