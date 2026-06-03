import { NextRequest, NextResponse } from 'next/server';
import { writeFile, mkdir } from 'fs/promises';
import path from 'path';
import { insertCandidate, linkCandidateToJob, getJob } from '@/lib/db';
import { sendEmail, isEmailConfigured } from '@/lib/mailer';

// Where new-application notifications are sent. Override with HR_NOTIFY_EMAIL.
const HR_NOTIFY_EMAIL = process.env.HR_NOTIFY_EMAIL || 'hr@warehousenow.in';

export async function POST(request: NextRequest) {
  const formData = await request.formData();

  const get = (k: string) => (formData.get(k) as string | null)?.trim() || '';
  const full_name = get('full_name');
  const email = get('email');
  const phone = get('phone');

  if (!full_name && !email && !phone) {
    return NextResponse.json({ error: 'At least name, email, or phone required' }, { status: 400 });
  }

  const job_id = get('job_id');

  // Handle optional CV upload: persist to disk and extract text for search.
  let resume_file = '';
  let resume_filename = '';
  let resume_text = '';
  let attachment: { filename: string; content: Buffer } | null = null;

  const file = formData.get('resume');
  if (file && typeof file !== 'string' && file.size > 0) {
    const buffer = Buffer.from(await file.arrayBuffer());
    const uploadDir = process.env.UPLOAD_DIR || path.join(process.cwd(), 'uploads');
    await mkdir(uploadDir, { recursive: true });

    const safeName = file.name.replace(/[^a-zA-Z0-9._-]/g, '_');
    const storedName = `${Date.now()}-${safeName}`;
    await writeFile(path.join(uploadDir, storedName), buffer);

    resume_file = `/uploads/${storedName}`;
    resume_filename = file.name;
    attachment = { filename: file.name, content: buffer };

    const ext = path.extname(file.name).toLowerCase();
    try {
      if (ext === '.pdf') {
        // eslint-disable-next-line @typescript-eslint/no-require-imports
        const { PDFParse } = require('pdf-parse');
        const parser = new PDFParse(new Uint8Array(buffer));
        await parser.load();
        const result = await parser.getText();
        resume_text = result.pages.map((pg: { text: string }) => pg.text).join('\n');
      } else if (ext === '.txt') {
        resume_text = buffer.toString('utf-8');
      } else if (ext === '.doc' || ext === '.docx') {
        // eslint-disable-next-line @typescript-eslint/no-require-imports
        const mammoth = require('mammoth');
        const result = await mammoth.extractRawText({ buffer });
        resume_text = result.value;
      }
    } catch {
      resume_text = '';
    }
  }

  const candidate = insertCandidate({
    full_name,
    phone,
    email,
    current_location: get('current_location'),
    current_employer: get('current_employer'),
    current_designation: get('current_designation'),
    previous_employer: '',
    previous_designation: '',
    date_of_birth: '',
    preferred_cities: '',
    hometown: '',
    notice_period: get('notice_period'),
    current_ctc: get('current_ctc'),
    expected_ctc: get('expected_ctc'),
    family_background: '',
    source: 'Career Page',
    resume_file,
    resume_filename,
    date_added: new Date().toISOString(),
    status: 'New',
    referrer_name: '',
    referrer_email: '',
    notes: '',
    department_id: '',
    job_id,
    resume_text,
  });

  if (job_id) {
    linkCandidateToJob(candidate.id, job_id);
  }

  // Notify HR of the new application (best-effort; never blocks the applicant).
  if (isEmailConfigured()) {
    try {
      const jobTitle = job_id ? (getJob(job_id)?.title || 'a position') : 'a position';
      const rows: [string, string][] = [
        ['Name', full_name],
        ['Email', email],
        ['Phone', phone],
        ['Applied for', jobTitle],
        ['Current company', get('current_employer')],
        ['Current role', get('current_designation')],
        ['Current city', get('current_location')],
        ['Notice period', get('notice_period')],
        ['Current CTC', get('current_ctc')],
        ['Expected CTC', get('expected_ctc')],
        ['Resume attached', attachment ? 'Yes' : 'No'],
      ];
      const body =
        `New application received via the careers page:\n\n` +
        rows.filter(([, v]) => v).map(([k, v]) => `${k}: ${v}`).join('\n');
      await sendEmail(
        HR_NOTIFY_EMAIL,
        `New application: ${full_name || email || phone} — ${jobTitle}`,
        body,
        attachment ? [attachment] : undefined,
      );
    } catch (err) {
      console.error('HR notification email failed:', err);
    }
  }

  return NextResponse.json({ success: true, candidate_id: candidate.id, portal_token: candidate.portal_token }, { status: 201 });
}
