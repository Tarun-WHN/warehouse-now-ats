import { NextRequest, NextResponse } from 'next/server';
import path from 'path';
import fs from 'fs/promises';
import { getSession } from '@/lib/auth';
import { getOfferTemplates, addOfferTemplate, addOfferDocTemplate, DATA_DIR } from '@/lib/db';
import { docxToHtml } from '@/lib/offer-docx';

const OFFER_DIR = path.join(DATA_DIR, 'offer-templates');

async function requireAdmin() {
  const session = await getSession();
  if (!session || session.role !== 'Admin') return null;
  return session;
}

export async function GET() {
  if (!(await requireAdmin())) return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
  return NextResponse.json(getOfferTemplates());
}

export async function POST(request: NextRequest) {
  if (!(await requireAdmin())) return NextResponse.json({ error: 'Forbidden' }, { status: 403 });

  const contentType = request.headers.get('content-type') || '';

  // .docx upload (the offer-letter formats)
  if (contentType.includes('multipart/form-data')) {
    const form = await request.formData();
    const file = form.get('file') as File | null;
    const name = (form.get('name') as string || '').trim();
    const category = (form.get('category') as string || '').trim();

    if (!file) return NextResponse.json({ error: 'A .docx file is required' }, { status: 400 });
    if (!name) return NextResponse.json({ error: 'A template name is required' }, { status: 400 });
    if (!/\.docx$/i.test(file.name)) {
      return NextResponse.json({ error: 'Please upload a Word .docx file (not .doc or PDF).' }, { status: 400 });
    }

    const buffer = Buffer.from(await file.arrayBuffer());
    await fs.mkdir(OFFER_DIR, { recursive: true });
    const stored = `${Date.now()}-${file.name.replace(/[^a-zA-Z0-9._-]/g, '_')}`;
    await fs.writeFile(path.join(OFFER_DIR, stored), buffer);

    const preview_html = await docxToHtml(buffer);

    const template = addOfferDocTemplate({
      name,
      category,
      file_path: stored,
      original_filename: file.name,
      preview_html,
    });
    return NextResponse.json(template, { status: 201 });
  }

  // Legacy JSON text template (kept for backward compatibility)
  const body = await request.json();
  if (!body.name || !body.body) {
    return NextResponse.json({ error: 'Name and body are required' }, { status: 400 });
  }
  const template = addOfferTemplate({
    name: body.name,
    body: body.body,
    variables: body.variables || [],
    is_active: body.is_active !== false,
  });
  return NextResponse.json(template, { status: 201 });
}
