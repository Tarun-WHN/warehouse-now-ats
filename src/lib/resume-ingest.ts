import { writeFile, mkdir } from 'fs/promises';
import path from 'path';
import { insertCandidate } from './db';
import { parseResumeText } from './parser';
import { parseResumeWithAI } from './ai-parser';
import type { Candidate } from './types';

const RESUME_EXTS = new Set(['.pdf', '.doc', '.docx', '.txt']);

/** True if a filename/contentType looks like a resume document we can parse. */
export function isResumeAttachment(filename: string, contentType?: string): boolean {
  const ext = path.extname(filename || '').toLowerCase();
  if (RESUME_EXTS.has(ext)) return true;
  const ct = (contentType || '').toLowerCase();
  return (
    ct === 'application/pdf' ||
    ct === 'application/msword' ||
    ct === 'application/vnd.openxmlformats-officedocument.wordprocessingml.document' ||
    ct === 'text/plain'
  );
}

/** Extract plain text from a resume buffer based on its extension. */
export async function extractResumeText(buffer: Buffer, filename: string): Promise<string> {
  const ext = path.extname(filename || '').toLowerCase();
  try {
    if (ext === '.pdf') {
      // eslint-disable-next-line @typescript-eslint/no-require-imports
      const { PDFParse } = require('pdf-parse');
      const parser = new PDFParse(new Uint8Array(buffer));
      await parser.load();
      const result = await parser.getText();
      return result.pages.map((pg: { text: string }) => pg.text).join('\n');
    }
    if (ext === '.txt') {
      return buffer.toString('utf-8');
    }
    if (ext === '.doc' || ext === '.docx') {
      // eslint-disable-next-line @typescript-eslint/no-require-imports
      const mammoth = require('mammoth');
      const result = await mammoth.extractRawText({ buffer });
      return result.value;
    }
  } catch {
    return '';
  }
  return '';
}

export interface IngestOptions {
  source: string;
  referrer_name?: string;
  referrer_email?: string;
  notes?: string;
}

export interface IngestResult {
  candidate: Candidate;
  parsed_fields: string[];
}

/**
 * Persist a resume file, parse it (AI first, regex fallback), and upsert the
 * candidate. Shared by the manual upload route and the inbound email ingester.
 */
export async function ingestResume(
  buffer: Buffer,
  originalName: string,
  opts: IngestOptions,
): Promise<IngestResult> {
  const uploadDir = process.env.UPLOAD_DIR || path.join(process.cwd(), 'uploads');
  await mkdir(uploadDir, { recursive: true });

  const safeName = (originalName || 'resume').replace(/[^a-zA-Z0-9._-]/g, '_');
  const storedName = `${Date.now()}-${safeName}`;
  await writeFile(path.join(uploadDir, storedName), buffer);

  const text = await extractResumeText(buffer, originalName);

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
    source: opts.source,
    resume_file: `/uploads/${storedName}`,
    resume_filename: originalName || storedName,
    date_added: new Date().toISOString(),
    status: 'New',
    referrer_name: opts.referrer_name || '',
    referrer_email: opts.referrer_email || '',
    notes: opts.notes || '',
    resume_text: text,
  });

  const parsed_fields = Object.entries(parsed)
    .filter(([k, v]) => k !== 'raw_text' && v)
    .map(([k]) => k);

  return { candidate, parsed_fields };
}
