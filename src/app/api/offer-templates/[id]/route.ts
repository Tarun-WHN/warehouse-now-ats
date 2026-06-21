import { NextRequest, NextResponse } from 'next/server';
import path from 'path';
import fs from 'fs/promises';
import { getSession } from '@/lib/auth';
import { getOfferTemplate, updateOfferTemplate, deleteOfferTemplate, DATA_DIR } from '@/lib/db';

const OFFER_DIR = path.join(DATA_DIR, 'offer-templates');

async function isAdmin() {
  const session = await getSession();
  return !!session && session.role === 'Admin';
}

// GET ?download=original → stream the stored .docx template
export async function GET(request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  if (!(await isAdmin())) return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
  const { id } = await params;
  const tpl = getOfferTemplate(id);
  if (!tpl) return NextResponse.json({ error: 'Not found' }, { status: 404 });

  if (request.nextUrl.searchParams.get('download') === 'original' && tpl.file_path) {
    try {
      const buf = await fs.readFile(path.join(OFFER_DIR, tpl.file_path));
      return new NextResponse(new Uint8Array(buf), {
        headers: {
          'Content-Type': 'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
          'Content-Disposition': `attachment; filename="${tpl.original_filename || 'template.docx'}"`,
        },
      });
    } catch {
      return NextResponse.json({ error: 'Stored file missing' }, { status: 404 });
    }
  }
  return NextResponse.json(tpl);
}

export async function PATCH(request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  if (!(await isAdmin())) return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
  const { id } = await params;
  const body = await request.json();
  const updated = updateOfferTemplate(id, body);
  if (!updated) return NextResponse.json({ error: 'Not found' }, { status: 404 });
  return NextResponse.json(updated);
}

export async function DELETE(_request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  if (!(await isAdmin())) return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
  const { id } = await params;
  const tpl = getOfferTemplate(id);
  const deleted = deleteOfferTemplate(id);
  if (!deleted) return NextResponse.json({ error: 'Not found' }, { status: 404 });
  // Best-effort cleanup of the stored .docx
  if (tpl?.file_path) {
    try { await fs.unlink(path.join(OFFER_DIR, tpl.file_path)); } catch { /* already gone */ }
  }
  return NextResponse.json({ success: true });
}
