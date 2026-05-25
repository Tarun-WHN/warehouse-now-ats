import { NextRequest, NextResponse } from 'next/server';
import { writeFile, mkdir } from 'fs/promises';
import path from 'path';
import { insertCandidate } from '@/lib/db';
import { parseResumeText } from '@/lib/parser';
import { parseResumeWithAI } from '@/lib/ai-parser';

export async function POST(request: NextRequest) {
  const formData = await request.formData();
  const files = formData.getAll('files') as File[];
  const source = (formData.get('source') as string) || 'Manual Upload';
  const referrerName = (formData.get('referrer_name') as string) || '';
  const referrerEmail = (formData.get('referrer_email') as string) || '';

  if (files.length === 0) {
    return NextResponse.json({ error: 'No files uploaded' }, { status: 400 });
  }

  const uploadDir = process.env.UPLOAD_DIR || path.join(process.cwd(), 'uploads');
  await mkdir(uploadDir, { recursive: true });

  const results = [];

  for (const file of files) {
    const bytes = await file.arrayBuffer();
    const buffer = Buffer.from(bytes);

    const ext = path.extname(file.name).toLowerCase();
    const filename = `${Date.now()}-${file.name.replace(/[^a-zA-Z0-9._-]/g, '_')}`;
    const filepath = path.join(uploadDir, filename);

    await writeFile(filepath, buffer);

    let text = '';
    if (ext === '.pdf') {
      try {
        // eslint-disable-next-line @typescript-eslint/no-require-imports
        const { PDFParse } = require('pdf-parse');
        const uint8 = new Uint8Array(buffer);
        const parser = new PDFParse(uint8);
        await parser.load();
        const result = await parser.getText();
        text = result.pages.map((pg: { text: string }) => pg.text).join('\n');
      } catch {
        text = '';
      }
    } else if (ext === '.txt') {
      text = buffer.toString('utf-8');
    } else if (ext === '.doc' || ext === '.docx') {
      try {
        // eslint-disable-next-line @typescript-eslint/no-require-imports
        const mammoth = require('mammoth');
        const result = await mammoth.extractRawText({ buffer });
        text = result.value;
      } catch {
        text = buffer.toString('utf-8').replace(/[^\x20-\x7E\n\r\t]/g, ' ');
      }
    }

    // Try AI parsing first (uses Claude API), fall back to regex
    const aiParsed = await parseResumeWithAI(text);
    const parsed = aiParsed || parseResumeText(text);

    const candidate = insertCandidate({
      full_name: parsed.full_name,
      phone: parsed.phone,
      email: parsed.email,
      current_location: parsed.current_location,
      current_employer: parsed.current_employer,
      current_designation: parsed.current_designation,
      previous_employer: parsed.previous_employer,
      previous_designation: parsed.previous_designation,
      date_of_birth: parsed.date_of_birth,
      preferred_cities: parsed.preferred_cities,
      hometown: parsed.hometown,
      notice_period: parsed.notice_period,
      current_ctc: parsed.current_ctc,
      expected_ctc: parsed.expected_ctc,
      family_background: parsed.family_background,
      source,
      resume_file: `/uploads/${filename}`,
      resume_filename: file.name,
      date_added: new Date().toISOString(),
      status: 'New',
      referrer_name: referrerName,
      referrer_email: referrerEmail,
      notes: '',
      resume_text: text,
    });

    results.push({
      filename: file.name,
      candidate,
      parsed_fields: Object.entries(parsed)
        .filter(([k, v]) => k !== 'raw_text' && v)
        .map(([k]) => k),
    });
  }

  return NextResponse.json({
    uploaded: results.length,
    results,
  });
}
