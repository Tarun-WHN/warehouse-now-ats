import Database from 'better-sqlite3';
import path from 'path';
import { Candidate, ActivityLog, EmailTemplate, DashboardStats, FilterParams, TeamMember, Remark } from './types';

const DB_PATH = path.join(process.cwd(), 'data', 'ats.db');

let db: Database.Database | null = null;

function getDb(): Database.Database {
  if (!db) {
    db = new Database(DB_PATH);
    db.pragma('journal_mode = WAL');
    db.pragma('foreign_keys = ON');
    initDb(db);
  }
  return db;
}

function initDb(db: Database.Database) {
  db.exec(`
    CREATE TABLE IF NOT EXISTS candidates (
      id TEXT PRIMARY KEY,
      full_name TEXT NOT NULL DEFAULT '',
      phone TEXT DEFAULT '',
      email TEXT DEFAULT '',
      current_location TEXT DEFAULT '',
      current_employer TEXT DEFAULT '',
      current_designation TEXT DEFAULT '',
      previous_employer TEXT DEFAULT '',
      previous_designation TEXT DEFAULT '',
      date_of_birth TEXT DEFAULT '',
      preferred_cities TEXT DEFAULT '',
      hometown TEXT DEFAULT '',
      notice_period TEXT DEFAULT '',
      current_ctc TEXT DEFAULT '',
      expected_ctc TEXT DEFAULT '',
      family_background TEXT DEFAULT '',
      source TEXT DEFAULT 'Manual',
      resume_file TEXT DEFAULT '',
      resume_filename TEXT DEFAULT '',
      date_added TEXT NOT NULL,
      status TEXT NOT NULL DEFAULT 'New',
      referrer_name TEXT DEFAULT '',
      referrer_email TEXT DEFAULT '',
      notes TEXT DEFAULT '',
      resume_text TEXT DEFAULT '',
      portal_token TEXT DEFAULT ''
    );

    CREATE INDEX IF NOT EXISTS idx_candidates_email ON candidates(email);
    CREATE INDEX IF NOT EXISTS idx_candidates_phone ON candidates(phone);
    CREATE INDEX IF NOT EXISTS idx_candidates_status ON candidates(status);
    CREATE INDEX IF NOT EXISTS idx_candidates_source ON candidates(source);
    CREATE INDEX IF NOT EXISTS idx_candidates_date ON candidates(date_added);
    CREATE TABLE IF NOT EXISTS activity_log (
      id TEXT PRIMARY KEY,
      candidate_id TEXT NOT NULL,
      action TEXT NOT NULL,
      details TEXT DEFAULT '',
      performed_by TEXT DEFAULT 'System',
      timestamp TEXT NOT NULL,
      FOREIGN KEY (candidate_id) REFERENCES candidates(id) ON DELETE CASCADE
    );

    CREATE INDEX IF NOT EXISTS idx_activity_candidate ON activity_log(candidate_id);

    CREATE TABLE IF NOT EXISTS email_templates (
      id TEXT PRIMARY KEY,
      name TEXT NOT NULL,
      subject TEXT NOT NULL,
      body TEXT NOT NULL,
      type TEXT NOT NULL
    );

    CREATE TABLE IF NOT EXISTS team_members (
      id TEXT PRIMARY KEY,
      name TEXT NOT NULL,
      email TEXT NOT NULL UNIQUE,
      role TEXT NOT NULL DEFAULT 'Viewer',
      phone TEXT DEFAULT '',
      department TEXT DEFAULT '',
      is_active INTEGER NOT NULL DEFAULT 1,
      created_at TEXT NOT NULL
    );

    CREATE INDEX IF NOT EXISTS idx_team_email ON team_members(email);

    CREATE TABLE IF NOT EXISTS remarks (
      id TEXT PRIMARY KEY,
      candidate_id TEXT NOT NULL,
      author_name TEXT NOT NULL,
      author_role TEXT DEFAULT '',
      rating INTEGER DEFAULT 0,
      comment TEXT NOT NULL,
      stage TEXT DEFAULT '',
      created_at TEXT NOT NULL,
      FOREIGN KEY (candidate_id) REFERENCES candidates(id) ON DELETE CASCADE
    );

    CREATE INDEX IF NOT EXISTS idx_remarks_candidate ON remarks(candidate_id);
  `);

  // Add portal_token column if missing (migration for existing DBs)
  try {
    db.exec(`ALTER TABLE candidates ADD COLUMN portal_token TEXT DEFAULT ''`);
  } catch { /* column already exists */ }
  db.exec(`CREATE INDEX IF NOT EXISTS idx_candidates_token ON candidates(portal_token)`);

  const templateCount = db.prepare('SELECT COUNT(*) as count FROM email_templates').get() as { count: number };
  if (templateCount.count === 0) {
    seedEmailTemplates(db);
  }
}

function seedEmailTemplates(db: Database.Database) {
  const templates: Omit<EmailTemplate, 'id'>[] = [
    {
      name: 'Missing Information Request',
      subject: 'Complete Your Profile - Warehouse Now Careers',
      body: `Dear {{candidate_name}},

Thank you for your interest in opportunities at Warehouse Now.

To help us match you with the right role, we need a few more details. Please take a moment to fill in the missing information:

{{missing_fields}}

You can reply to this email or update your profile here: {{profile_link}}

Best regards,
Talent Acquisition Team
Warehouse Now`,
      type: 'missing_info'
    },
    {
      name: 'Interest Confirmation',
      subject: 'Exciting Opportunities at Warehouse Now',
      body: `Dear {{candidate_name}},

We came across your profile and believe you could be a great fit for our team at Warehouse Now.

We are currently hiring for roles in warehouse operations, logistics, and supply chain management across multiple cities in India.

Are you open to exploring opportunities with us? If yes, please reply to this email or click the link below:

{{confirm_link}}

We look forward to hearing from you!

Best regards,
Talent Acquisition Team
Warehouse Now`,
      type: 'interest_check'
    },
    {
      name: 'Interview Scheduling',
      subject: 'Interview Invitation - {{position}} at Warehouse Now',
      body: `Dear {{candidate_name}},

Congratulations! We would like to invite you for an interview for the {{position}} role at Warehouse Now.

Interview Details:
- Date: {{interview_date}}
- Time: {{interview_time}}
- Mode: {{interview_mode}}
- Panel: {{interviewers}}

Please confirm your availability by replying to this email.

If the proposed time doesn't work, please suggest alternative slots and we'll do our best to accommodate.

Best regards,
Talent Acquisition Team
Warehouse Now`,
      type: 'interview_schedule'
    },
    {
      name: 'New Vacancy Alert',
      subject: 'New Openings at Warehouse Now - We Thought of You!',
      body: `Dear {{candidate_name}},

We have exciting new openings at Warehouse Now that might interest you:

{{vacancy_details}}

Locations: {{locations}}

If you're interested, please reply to this email or apply through our portal.

Know someone who'd be a great fit? Refer them using this link and help us grow our team:
{{referral_link}}

Best regards,
Talent Acquisition Team
Warehouse Now`,
      type: 'vacancy_alert'
    }
  ];

  const insert = db.prepare(
    'INSERT INTO email_templates (id, name, subject, body, type) VALUES (?, ?, ?, ?, ?)'
  );

  for (const t of templates) {
    insert.run(crypto.randomUUID(), t.name, t.subject, t.body, t.type);
  }
}

// ─── Candidates ───

export function findDuplicate(phone: string, email: string): Candidate | null {
  const db = getDb();
  if (phone) {
    const byPhone = db.prepare('SELECT * FROM candidates WHERE phone = ?').get(phone) as Candidate | undefined;
    if (byPhone) return byPhone;
  }
  if (email) {
    const byEmail = db.prepare('SELECT * FROM candidates WHERE email = ?').get(email) as Candidate | undefined;
    if (byEmail) return byEmail;
  }
  return null;
}

export function insertCandidate(candidate: Omit<Candidate, 'id'> & { id?: string; resume_text?: string }): Candidate {
  const db = getDb();
  const id = candidate.id || crypto.randomUUID();
  const portalToken = crypto.randomUUID().replace(/-/g, '').slice(0, 16);

  const existing = findDuplicate(candidate.phone, candidate.email);
  if (existing) {
    const updates: string[] = [];
    const values: unknown[] = [];
    const fields = [
      'full_name', 'phone', 'email', 'current_location', 'current_employer',
      'current_designation', 'previous_employer', 'previous_designation',
      'date_of_birth', 'preferred_cities', 'hometown', 'notice_period',
      'current_ctc', 'expected_ctc', 'family_background', 'source',
      'resume_file', 'resume_filename', 'notes'
    ] as const;

    for (const field of fields) {
      const newVal = candidate[field];
      const existingVal = existing[field];
      if (newVal && (!existingVal || existingVal === '')) {
        updates.push(`${field} = ?`);
        values.push(newVal);
      }
    }

    if (candidate.resume_file && candidate.resume_file !== '') {
      updates.push('resume_file = ?', 'resume_filename = ?');
      values.push(candidate.resume_file, candidate.resume_filename);
    }

    if (updates.length > 0) {
      values.push(existing.id);
      db.prepare(`UPDATE candidates SET ${updates.join(', ')} WHERE id = ?`).run(...values);
    }

    logActivity(existing.id, 'Profile Updated', 'Duplicate detected - merged new data');
    return db.prepare('SELECT * FROM candidates WHERE id = ?').get(existing.id) as Candidate;
  }

  db.prepare(`
    INSERT INTO candidates (id, full_name, phone, email, current_location, current_employer,
      current_designation, previous_employer, previous_designation, date_of_birth,
      preferred_cities, hometown, notice_period, current_ctc, expected_ctc,
      family_background, source, resume_file, resume_filename, date_added, status,
      referrer_name, referrer_email, notes, resume_text, portal_token)
    VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
  `).run(
    id, candidate.full_name, candidate.phone, candidate.email,
    candidate.current_location, candidate.current_employer, candidate.current_designation,
    candidate.previous_employer, candidate.previous_designation, candidate.date_of_birth,
    candidate.preferred_cities, candidate.hometown, candidate.notice_period,
    candidate.current_ctc, candidate.expected_ctc, candidate.family_background,
    candidate.source, candidate.resume_file, candidate.resume_filename,
    candidate.date_added, candidate.status || 'New',
    candidate.referrer_name || '', candidate.referrer_email || '',
    candidate.notes || '', candidate.resume_text || '', portalToken
  );

  logActivity(id, 'Candidate Added', `Source: ${candidate.source}`);
  return db.prepare('SELECT * FROM candidates WHERE id = ?').get(id) as Candidate;
}

export function getCandidates(filters: FilterParams): { candidates: Candidate[]; total: number } {
  const db = getDb();
  const conditions: string[] = [];
  const params: unknown[] = [];

  if (filters.search) {
    conditions.push(`(full_name LIKE ? OR email LIKE ? OR phone LIKE ? OR current_employer LIKE ? OR current_designation LIKE ? OR resume_text LIKE ?)`);
    const s = `%${filters.search}%`;
    params.push(s, s, s, s, s, s);
  }
  if (filters.status && filters.status !== 'All') {
    conditions.push('status = ?');
    params.push(filters.status);
  }
  if (filters.source && filters.source !== 'All') {
    conditions.push('source = ?');
    params.push(filters.source);
  }
  if (filters.location) {
    conditions.push('current_location LIKE ?');
    params.push(`%${filters.location}%`);
  }
  if (filters.designation) {
    conditions.push('current_designation LIKE ?');
    params.push(`%${filters.designation}%`);
  }
  if (filters.min_ctc) {
    conditions.push("CAST(REPLACE(REPLACE(current_ctc, ',', ''), ' ', '') AS REAL) >= ?");
    params.push(parseFloat(filters.min_ctc));
  }
  if (filters.max_ctc) {
    conditions.push("CAST(REPLACE(REPLACE(current_ctc, ',', ''), ' ', '') AS REAL) <= ?");
    params.push(parseFloat(filters.max_ctc));
  }
  if (filters.notice_period) {
    conditions.push('notice_period LIKE ?');
    params.push(`%${filters.notice_period}%`);
  }

  const where = conditions.length > 0 ? `WHERE ${conditions.join(' AND ')}` : '';
  const sortBy = filters.sort_by || 'date_added';
  const sortOrder = filters.sort_order || 'desc';
  const page = filters.page || 1;
  const perPage = filters.per_page || 50;
  const offset = (page - 1) * perPage;

  const total = (db.prepare(`SELECT COUNT(*) as count FROM candidates ${where}`).get(...params) as { count: number }).count;

  const candidates = db.prepare(
    `SELECT id, full_name, phone, email, current_location, current_employer,
      current_designation, previous_employer, previous_designation, date_of_birth,
      preferred_cities, hometown, notice_period, current_ctc, expected_ctc,
      family_background, source, resume_file, resume_filename, date_added, status,
      referrer_name, referrer_email, notes, portal_token
    FROM candidates ${where} ORDER BY ${sortBy} ${sortOrder} LIMIT ? OFFSET ?`
  ).all(...params, perPage, offset) as Candidate[];

  return { candidates, total };
}

export function getCandidate(id: string): Candidate | null {
  const db = getDb();
  return (db.prepare('SELECT * FROM candidates WHERE id = ?').get(id) as Candidate) || null;
}

export function getCandidateByToken(token: string): Candidate | null {
  const db = getDb();
  if (!token) return null;
  return (db.prepare("SELECT * FROM candidates WHERE portal_token = ? AND portal_token != ''").get(token) as Candidate) || null;
}

export function updateCandidate(id: string, updates: Partial<Candidate>): Candidate | null {
  const db = getDb();
  const fields = Object.keys(updates).filter(k => k !== 'id');
  if (fields.length === 0) return getCandidate(id);

  const sets = fields.map(f => `${f} = ?`).join(', ');
  const values = fields.map(f => (updates as Record<string, unknown>)[f]);
  values.push(id);

  db.prepare(`UPDATE candidates SET ${sets} WHERE id = ?`).run(...values);
  logActivity(id, 'Profile Updated', `Updated: ${fields.join(', ')}`);
  return getCandidate(id);
}

export function deleteCandidate(id: string): boolean {
  const db = getDb();
  const result = db.prepare('DELETE FROM candidates WHERE id = ?').run(id);
  return result.changes > 0;
}

// ─── Activity Log ───

export function logActivity(candidateId: string, action: string, details: string, performedBy = 'System') {
  const db = getDb();
  db.prepare(
    'INSERT INTO activity_log (id, candidate_id, action, details, performed_by, timestamp) VALUES (?, ?, ?, ?, ?, ?)'
  ).run(crypto.randomUUID(), candidateId, action, details, performedBy, new Date().toISOString());
}

export function getActivityLog(candidateId: string): ActivityLog[] {
  const db = getDb();
  return db.prepare(
    'SELECT * FROM activity_log WHERE candidate_id = ? ORDER BY timestamp DESC LIMIT 50'
  ).all(candidateId) as ActivityLog[];
}

// ─── Remarks / Feedback ───

export function addRemark(remark: Omit<Remark, 'id' | 'created_at'>): Remark {
  const db = getDb();
  const id = crypto.randomUUID();
  const created_at = new Date().toISOString();
  db.prepare(
    'INSERT INTO remarks (id, candidate_id, author_name, author_role, rating, comment, stage, created_at) VALUES (?, ?, ?, ?, ?, ?, ?, ?)'
  ).run(id, remark.candidate_id, remark.author_name, remark.author_role, remark.rating, remark.comment, remark.stage, created_at);
  logActivity(remark.candidate_id, 'Remark Added', `By ${remark.author_name}: ${remark.comment.slice(0, 60)}...`, remark.author_name);
  return { id, ...remark, created_at };
}

export function getRemarks(candidateId: string): Remark[] {
  const db = getDb();
  return db.prepare('SELECT * FROM remarks WHERE candidate_id = ? ORDER BY created_at DESC').all(candidateId) as Remark[];
}

export function deleteRemark(id: string): boolean {
  const db = getDb();
  return db.prepare('DELETE FROM remarks WHERE id = ?').run(id).changes > 0;
}

// ─── Team Members ───

export function getTeamMembers(): TeamMember[] {
  const db = getDb();
  return db.prepare('SELECT * FROM team_members ORDER BY created_at DESC').all() as TeamMember[];
}

export function getTeamMember(id: string): TeamMember | null {
  const db = getDb();
  return (db.prepare('SELECT * FROM team_members WHERE id = ?').get(id) as TeamMember) || null;
}

export function addTeamMember(member: Omit<TeamMember, 'id' | 'created_at'>): TeamMember {
  const db = getDb();
  const id = crypto.randomUUID();
  const created_at = new Date().toISOString();
  db.prepare(
    'INSERT INTO team_members (id, name, email, role, phone, department, is_active, created_at) VALUES (?, ?, ?, ?, ?, ?, ?, ?)'
  ).run(id, member.name, member.email, member.role, member.phone || '', member.department || '', member.is_active ? 1 : 0, created_at);
  return { id, ...member, created_at };
}

export function updateTeamMember(id: string, updates: Partial<TeamMember>): TeamMember | null {
  const db = getDb();
  const fields = Object.keys(updates).filter(k => k !== 'id' && k !== 'created_at');
  if (fields.length === 0) return getTeamMember(id);
  const sets = fields.map(f => `${f} = ?`).join(', ');
  const values = fields.map(f => {
    if (f === 'is_active') return (updates as Record<string, unknown>)[f] ? 1 : 0;
    return (updates as Record<string, unknown>)[f];
  });
  values.push(id);
  db.prepare(`UPDATE team_members SET ${sets} WHERE id = ?`).run(...values);
  return getTeamMember(id);
}

export function deleteTeamMember(id: string): boolean {
  const db = getDb();
  return db.prepare('DELETE FROM team_members WHERE id = ?').run(id).changes > 0;
}

// ─── Stats ───

export function getStats(): DashboardStats {
  const db = getDb();
  const total = (db.prepare('SELECT COUNT(*) as count FROM candidates').get() as { count: number }).count;

  const oneWeekAgo = new Date();
  oneWeekAgo.setDate(oneWeekAgo.getDate() - 7);
  const newThisWeek = (db.prepare('SELECT COUNT(*) as count FROM candidates WHERE date_added >= ?').get(oneWeekAgo.toISOString()) as { count: number }).count;

  const statusCounts = db.prepare(
    "SELECT status, COUNT(*) as count FROM candidates GROUP BY status"
  ).all() as { status: string; count: number }[];

  const getCount = (status: string) => statusCounts.find(s => s.status === status)?.count || 0;

  const sources = db.prepare(
    "SELECT source, COUNT(*) as count FROM candidates GROUP BY source ORDER BY count DESC"
  ).all() as { source: string; count: number }[];

  const recent = db.prepare(
    `SELECT id, full_name, phone, email, current_location, current_employer,
      current_designation, source, date_added, status
    FROM candidates ORDER BY date_added DESC LIMIT 10`
  ).all() as Candidate[];

  return {
    total_candidates: total,
    new_this_week: newThisWeek,
    contacted: getCount('Contacted'),
    interviewing: getCount('Interviewing'),
    hired: getCount('Hired'),
    rejected: getCount('Rejected'),
    sources,
    recent_candidates: recent,
  };
}

// ─── Email Templates ───

export function getEmailTemplates(): EmailTemplate[] {
  const db = getDb();
  return db.prepare('SELECT * FROM email_templates').all() as EmailTemplate[];
}

export function updateEmailTemplate(id: string, updates: Partial<EmailTemplate>): EmailTemplate | null {
  const db = getDb();
  const fields = Object.keys(updates).filter(k => k !== 'id');
  if (fields.length === 0) return null;
  const sets = fields.map(f => `${f} = ?`).join(', ');
  const values = fields.map(f => (updates as Record<string, unknown>)[f]);
  values.push(id);
  db.prepare(`UPDATE email_templates SET ${sets} WHERE id = ?`).run(...values);
  return db.prepare('SELECT * FROM email_templates WHERE id = ?').get(id) as EmailTemplate;
}

// ─── Export ───

export function exportCandidatesCSV(filters: FilterParams): string {
  const { candidates } = getCandidates({ ...filters, per_page: 100000 });
  const headers = [
    'Full Name', 'Phone', 'Email', 'Current Location', 'Current Employer',
    'Current Designation', 'Previous Employer', 'Previous Designation',
    'Date of Birth', 'Preferred Cities', 'Hometown', 'Notice Period',
    'Current CTC', 'Expected CTC', 'Family Background', 'Source',
    'Date Added', 'Status', 'Referrer Name', 'Notes'
  ];
  const rows = candidates.map(c => [
    c.full_name, c.phone, c.email, c.current_location, c.current_employer,
    c.current_designation, c.previous_employer, c.previous_designation,
    c.date_of_birth, c.preferred_cities, c.hometown, c.notice_period,
    c.current_ctc, c.expected_ctc, c.family_background, c.source,
    c.date_added, c.status, c.referrer_name, c.notes
  ].map(v => `"${(v || '').replace(/"/g, '""')}"`).join(','));

  return [headers.join(','), ...rows].join('\n');
}

export function getAllSources(): string[] {
  const db = getDb();
  return (db.prepare("SELECT DISTINCT source FROM candidates WHERE source != '' ORDER BY source").all() as { source: string }[]).map(r => r.source);
}

export function getAllLocations(): string[] {
  const db = getDb();
  return (db.prepare("SELECT DISTINCT current_location FROM candidates WHERE current_location != '' ORDER BY current_location").all() as { current_location: string }[]).map(r => r.current_location);
}
