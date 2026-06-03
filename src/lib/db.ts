import Database from 'better-sqlite3';
import path from 'path';
import fs from 'fs';
import {
  Candidate, ActivityLog, EmailTemplate, DashboardStats, FilterParams,
  TeamMember, Remark, Department, Job, CandidateJob, Interview, Scorecard,
  OfferTemplate, WorkflowRule
} from './types';

const DATA_DIR = process.env.DATA_DIR || path.join(process.cwd(), 'data');
const DB_PATH = path.join(DATA_DIR, 'ats.db');

let db: Database.Database | null = null;

function getDb(): Database.Database {
  if (!db) {
    // Create the data dir lazily at runtime (NOT at module load), so the
    // production build doesn't try to mkdir a persistent-disk path that
    // only mounts at runtime.
    if (!fs.existsSync(DATA_DIR)) fs.mkdirSync(DATA_DIR, { recursive: true });
    db = new Database(DB_PATH);
    db.pragma('journal_mode = WAL');
    db.pragma('foreign_keys = ON');
    initDb(db);
    backfillCandidatePasswords(db);
  }
  return db;
}

// Consistent online backup of the live SQLite database (safe under WAL mode).
// Writes a single self-contained .db file to destPath.
export async function backupDatabase(destPath: string): Promise<void> {
  await getDb().backup(destPath);
}

export { DATA_DIR };

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

    CREATE TABLE IF NOT EXISTS departments (
      id TEXT PRIMARY KEY,
      name TEXT NOT NULL UNIQUE,
      description TEXT DEFAULT '',
      head TEXT DEFAULT '',
      is_active INTEGER NOT NULL DEFAULT 1,
      created_at TEXT NOT NULL
    );

    CREATE TABLE IF NOT EXISTS jobs (
      id TEXT PRIMARY KEY,
      title TEXT NOT NULL,
      department_id TEXT DEFAULT '',
      posted_by TEXT DEFAULT '',
      num_positions INTEGER DEFAULT 1,
      warehouse_site TEXT DEFAULT '',
      expected_salary_min TEXT DEFAULT '',
      expected_salary_max TEXT DEFAULT '',
      description TEXT DEFAULT '',
      requirements TEXT DEFAULT '',
      status TEXT NOT NULL DEFAULT 'Open',
      priority TEXT DEFAULT 'Normal',
      created_at TEXT NOT NULL,
      updated_at TEXT NOT NULL
    );
    CREATE INDEX IF NOT EXISTS idx_jobs_status ON jobs(status);
    CREATE INDEX IF NOT EXISTS idx_jobs_department ON jobs(department_id);

    CREATE TABLE IF NOT EXISTS candidate_jobs (
      id TEXT PRIMARY KEY,
      candidate_id TEXT NOT NULL,
      job_id TEXT NOT NULL,
      applied_at TEXT NOT NULL,
      status TEXT DEFAULT 'Applied',
      FOREIGN KEY (candidate_id) REFERENCES candidates(id) ON DELETE CASCADE,
      FOREIGN KEY (job_id) REFERENCES jobs(id) ON DELETE CASCADE,
      UNIQUE(candidate_id, job_id)
    );
    CREATE INDEX IF NOT EXISTS idx_cj_candidate ON candidate_jobs(candidate_id);
    CREATE INDEX IF NOT EXISTS idx_cj_job ON candidate_jobs(job_id);

    CREATE TABLE IF NOT EXISTS interviews (
      id TEXT PRIMARY KEY,
      candidate_id TEXT NOT NULL,
      job_id TEXT DEFAULT '',
      interviewer_id TEXT DEFAULT '',
      scheduled_at TEXT NOT NULL,
      duration INTEGER DEFAULT 60,
      type TEXT DEFAULT 'Video Call',
      location TEXT DEFAULT '',
      notes TEXT DEFAULT '',
      status TEXT DEFAULT 'Scheduled',
      created_at TEXT NOT NULL,
      FOREIGN KEY (candidate_id) REFERENCES candidates(id) ON DELETE CASCADE
    );
    CREATE INDEX IF NOT EXISTS idx_interviews_candidate ON interviews(candidate_id);
    CREATE INDEX IF NOT EXISTS idx_interviews_date ON interviews(scheduled_at);

    CREATE TABLE IF NOT EXISTS scorecards (
      id TEXT PRIMARY KEY,
      interview_id TEXT NOT NULL,
      evaluator_id TEXT DEFAULT '',
      evaluator_name TEXT DEFAULT '',
      overall_rating INTEGER DEFAULT 0,
      recommendation TEXT DEFAULT '',
      notes TEXT DEFAULT '',
      attributes TEXT DEFAULT '[]',
      created_at TEXT NOT NULL,
      FOREIGN KEY (interview_id) REFERENCES interviews(id) ON DELETE CASCADE
    );
    CREATE INDEX IF NOT EXISTS idx_scorecards_interview ON scorecards(interview_id);

    CREATE TABLE IF NOT EXISTS offer_templates (
      id TEXT PRIMARY KEY,
      name TEXT NOT NULL,
      body TEXT NOT NULL,
      variables TEXT DEFAULT '[]',
      is_active INTEGER DEFAULT 1,
      created_at TEXT NOT NULL
    );

    CREATE TABLE IF NOT EXISTS workflow_rules (
      id TEXT PRIMARY KEY,
      from_status TEXT NOT NULL,
      to_status TEXT NOT NULL,
      template_id TEXT DEFAULT '',
      is_active INTEGER DEFAULT 1,
      created_at TEXT NOT NULL
    );

    CREATE TABLE IF NOT EXISTS processed_emails (
      message_id TEXT PRIMARY KEY,
      from_address TEXT DEFAULT '',
      subject TEXT DEFAULT '',
      attachments INTEGER DEFAULT 0,
      candidates_added INTEGER DEFAULT 0,
      processed_at TEXT NOT NULL
    );
  `);

  // Migrations for existing DBs
  const migrations = [
    `ALTER TABLE candidates ADD COLUMN portal_token TEXT DEFAULT ''`,
    `ALTER TABLE candidates ADD COLUMN department_id TEXT DEFAULT ''`,
    `ALTER TABLE candidates ADD COLUMN status_changed_at TEXT DEFAULT ''`,
    `ALTER TABLE candidates ADD COLUMN job_id TEXT DEFAULT ''`,
    `ALTER TABLE email_templates ADD COLUMN category TEXT DEFAULT 'general'`,
    `ALTER TABLE team_members ADD COLUMN password_hash TEXT DEFAULT ''`,
    `ALTER TABLE candidates ADD COLUMN password_hash TEXT DEFAULT ''`,
    `ALTER TABLE remarks ADD COLUMN outcome TEXT DEFAULT ''`,
  ];
  for (const m of migrations) {
    try { db.exec(m); } catch { /* column exists */ }
  }
  db.exec(`CREATE INDEX IF NOT EXISTS idx_candidates_token ON candidates(portal_token)`);
  db.exec(`CREATE INDEX IF NOT EXISTS idx_candidates_dept ON candidates(department_id)`);

  // Seed email templates
  const templateCount = db.prepare('SELECT COUNT(*) as count FROM email_templates').get() as { count: number };
  if (templateCount.count === 0) seedEmailTemplates(db);

  // Seed default departments
  const deptCount = db.prepare('SELECT COUNT(*) as count FROM departments').get() as { count: number };
  if (deptCount.count === 0) seedDepartments(db);

  // Seed default admin if no team members exist
  const teamCount = db.prepare('SELECT COUNT(*) as count FROM team_members').get() as { count: number };
  if (teamCount.count === 0) seedDefaultAdmin(db);
}

function seedEmailTemplates(db: Database.Database) {
  const templates = [
    { name: 'Missing Information Request', subject: 'Complete Your Profile - Warehouse Now Careers', body: `Dear {{candidate_name}},\n\nThank you for your interest in opportunities at Warehouse Now.\n\nTo help us match you with the right role, we need a few more details:\n\n{{missing_fields}}\n\nPlease update your profile here: {{profile_link}}\n\nBest regards,\nTalent Acquisition Team\nWarehouse Now`, type: 'missing_info', category: 'outreach' },
    { name: 'Interest Confirmation', subject: 'Exciting Opportunities at Warehouse Now', body: `Dear {{candidate_name}},\n\nWe came across your profile and believe you could be a great fit for our team at Warehouse Now.\n\nWe are currently hiring for roles in warehouse operations, logistics, and supply chain management.\n\nAre you open to exploring opportunities? Reply to this email or click:\n{{confirm_link}}\n\nBest regards,\nTalent Acquisition Team\nWarehouse Now`, type: 'interest_check', category: 'outreach' },
    { name: 'Interview Scheduling', subject: 'Interview Invitation - {{position}} at Warehouse Now', body: `Dear {{candidate_name}},\n\nCongratulations! We would like to invite you for an interview for the {{position}} role.\n\nInterview Details:\n- Date: {{interview_date}}\n- Time: {{interview_time}}\n- Mode: {{interview_mode}}\n- Panel: {{interviewers}}\n\nPlease confirm your availability by replying to this email.\n\nBest regards,\nTalent Acquisition Team\nWarehouse Now`, type: 'interview_schedule', category: 'interview' },
    { name: 'New Vacancy Alert', subject: 'New Openings at Warehouse Now - We Thought of You!', body: `Dear {{candidate_name}},\n\nWe have exciting new openings that might interest you:\n\n{{vacancy_details}}\n\nLocations: {{locations}}\n\nRefer someone: {{referral_link}}\n\nBest regards,\nTalent Acquisition Team\nWarehouse Now`, type: 'vacancy_alert', category: 'outreach' },
    { name: 'Application Received', subject: 'We Received Your Application - Warehouse Now', body: `Dear {{candidate_name}},\n\nThank you for applying to {{position}} at Warehouse Now.\n\nYour application has been received and our recruitment team will review it shortly. You can track your application status here: {{portal_link}}\n\nBest regards,\nTalent Acquisition Team\nWarehouse Now`, type: 'acknowledgement', category: 'auto' },
    { name: 'Offer Letter', subject: 'Offer of Employment - {{position}} at Warehouse Now', body: `Dear {{candidate_name}},\n\nWe are pleased to offer you the position of {{position}} at Warehouse Now.\n\nDetails:\n- Department: {{department}}\n- Location: {{location}}\n- CTC: {{offered_ctc}}\n- Joining Date: {{joining_date}}\n\nPlease confirm your acceptance by replying to this email.\n\nBest regards,\nHR Team\nWarehouse Now`, type: 'offer', category: 'offer' },
    { name: 'Rejection Notice', subject: 'Update on Your Application - Warehouse Now', body: `Dear {{candidate_name}},\n\nThank you for your interest in the {{position}} role at Warehouse Now.\n\nAfter careful consideration, we have decided to move forward with other candidates for this role. We will keep your profile in our talent pool for future opportunities.\n\nWe wish you the best in your career.\n\nBest regards,\nTalent Acquisition Team\nWarehouse Now`, type: 'rejection', category: 'auto' },
  ];
  const insert = db.prepare('INSERT INTO email_templates (id, name, subject, body, type, category) VALUES (?, ?, ?, ?, ?, ?)');
  for (const t of templates) insert.run(crypto.randomUUID(), t.name, t.subject, t.body, t.type, t.category);
}

function seedDepartments(db: Database.Database) {
  const depts = ['Warehouse Operations', 'Logistics', 'Supply Chain', 'HR & Admin', 'Finance', 'Technology', 'Sales & Marketing', 'Quality & Compliance'];
  const insert = db.prepare('INSERT INTO departments (id, name, description, head, is_active, created_at) VALUES (?, ?, ?, ?, 1, ?)');
  const now = new Date().toISOString();
  for (const d of depts) insert.run(crypto.randomUUID(), d, '', '', now);
}

function seedDefaultAdmin(db: Database.Database) {
  // First-boot admin. Credentials come from env (ADMIN_EMAIL / ADMIN_PASSWORD)
  // with a dev fallback. Change the password after first login.
  const { hashPassword } = require('./auth');
  const now = new Date().toISOString();
  const adminEmail = (process.env.ADMIN_EMAIL || 'admin@warehousenow.in').toLowerCase();
  const adminPassword = process.env.ADMIN_PASSWORD || 'admin123';
  db.prepare(
    'INSERT INTO team_members (id, name, email, role, phone, department, is_active, created_at, password_hash) VALUES (?, ?, ?, ?, ?, ?, 1, ?, ?)'
  ).run(crypto.randomUUID(), 'Admin', adminEmail, 'Admin', '', 'HR & Admin', now, hashPassword(adminPassword));
}

// Backfill passwords for existing candidates that have none
function backfillCandidatePasswords(db: Database.Database) {
  try {
    const { hashPassword } = require('./auth');
    const rows = db.prepare("SELECT id FROM candidates WHERE password_hash IS NULL OR password_hash = ''").all() as { id: string }[];
    if (rows.length === 0) return;
    const hash = hashPassword('welcome123');
    const update = db.prepare('UPDATE candidates SET password_hash = ? WHERE id = ?');
    for (const row of rows) {
      update.run(hash, row.id);
    }
    console.log(`[DB] Backfilled passwords for ${rows.length} candidates`);
  } catch { /* auth not available during edge/build */ }
}

// ═══════════════════════════════════════════════════
// ─── Candidates ───
// ═══════════════════════════════════════════════════

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

// ─── Inbound email dedupe (resume forwarding) ───

export function isEmailProcessed(messageId: string): boolean {
  if (!messageId) return false;
  const row = getDb().prepare('SELECT 1 FROM processed_emails WHERE message_id = ?').get(messageId);
  return !!row;
}

export function markEmailProcessed(meta: {
  message_id: string;
  from_address?: string;
  subject?: string;
  attachments?: number;
  candidates_added?: number;
}): void {
  if (!meta.message_id) return;
  getDb().prepare(
    `INSERT OR IGNORE INTO processed_emails
       (message_id, from_address, subject, attachments, candidates_added, processed_at)
     VALUES (?, ?, ?, ?, ?, ?)`
  ).run(
    meta.message_id,
    meta.from_address || '',
    meta.subject || '',
    meta.attachments || 0,
    meta.candidates_added || 0,
    new Date().toISOString(),
  );
}

export function insertCandidate(candidate: Omit<Candidate, 'id'> & { id?: string; resume_text?: string }): Candidate {
  const db = getDb();
  const id = candidate.id || crypto.randomUUID();
  const portalToken = crypto.randomUUID().replace(/-/g, '').slice(0, 16);
  const now = new Date().toISOString();

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
    if (candidate.department_id) {
      updates.push('department_id = ?');
      values.push(candidate.department_id);
    }
    if (candidate.job_id) {
      updates.push('job_id = ?');
      values.push(candidate.job_id);
    }

    // Set password if missing on existing candidate
    const existingRow = db.prepare('SELECT password_hash FROM candidates WHERE id = ?').get(existing.id) as { password_hash?: string } | undefined;
    if (!existingRow?.password_hash) {
      try {
        const { hashPassword: hp } = require('./auth');
        updates.push('password_hash = ?');
        values.push(hp('welcome123'));
      } catch { /* auth not available during edge/build */ }
    }

    if (updates.length > 0) {
      values.push(existing.id);
      db.prepare(`UPDATE candidates SET ${updates.join(', ')} WHERE id = ?`).run(...values);
    }

    logActivity(existing.id, 'Profile Updated', 'Duplicate detected - merged new data');
    return db.prepare('SELECT * FROM candidates WHERE id = ?').get(existing.id) as Candidate;
  }

  // Default password = welcome123
  let defaultPasswordHash = '';
  try {
    const { hashPassword: hp } = require('./auth');
    defaultPasswordHash = hp('welcome123');
  } catch { /* auth not available during edge/build */ }

  db.prepare(`
    INSERT INTO candidates (id, full_name, phone, email, current_location, current_employer,
      current_designation, previous_employer, previous_designation, date_of_birth,
      preferred_cities, hometown, notice_period, current_ctc, expected_ctc,
      family_background, source, resume_file, resume_filename, date_added, status,
      referrer_name, referrer_email, notes, resume_text, portal_token, department_id, status_changed_at, job_id, password_hash)
    VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
  `).run(
    id, candidate.full_name, candidate.phone, candidate.email,
    candidate.current_location, candidate.current_employer, candidate.current_designation,
    candidate.previous_employer, candidate.previous_designation, candidate.date_of_birth,
    candidate.preferred_cities, candidate.hometown, candidate.notice_period,
    candidate.current_ctc, candidate.expected_ctc, candidate.family_background,
    candidate.source, candidate.resume_file, candidate.resume_filename,
    candidate.date_added, candidate.status || 'New',
    candidate.referrer_name || '', candidate.referrer_email || '',
    candidate.notes || '', candidate.resume_text || '', portalToken,
    candidate.department_id || '', now, candidate.job_id || '', defaultPasswordHash
  );

  logActivity(id, 'Candidate Added', `Source: ${candidate.source}`);
  return db.prepare('SELECT * FROM candidates WHERE id = ?').get(id) as Candidate;
}

export function getCandidates(filters: FilterParams): { candidates: Candidate[]; total: number } {
  const db = getDb();
  const conditions: string[] = [];
  const params: unknown[] = [];

  if (filters.search) {
    conditions.push(`(c.full_name LIKE ? OR c.email LIKE ? OR c.phone LIKE ? OR c.current_employer LIKE ? OR c.current_designation LIKE ?)`);
    const s = `%${filters.search}%`;
    params.push(s, s, s, s, s);
  }
  if (filters.status && filters.status !== 'All') {
    conditions.push('c.status = ?');
    params.push(filters.status);
  }
  if (filters.source && filters.source !== 'All') {
    conditions.push('c.source = ?');
    params.push(filters.source);
  }
  if (filters.location) {
    conditions.push('c.current_location LIKE ?');
    params.push(`%${filters.location}%`);
  }
  if (filters.designation) {
    conditions.push('c.current_designation LIKE ?');
    params.push(`%${filters.designation}%`);
  }
  if (filters.department_id) {
    conditions.push('c.department_id = ?');
    params.push(filters.department_id);
  }
  if (filters.job_id) {
    conditions.push('c.job_id = ?');
    params.push(filters.job_id);
  }
  if (filters.min_ctc) {
    conditions.push("CAST(REPLACE(REPLACE(c.current_ctc, ',', ''), ' ', '') AS REAL) >= ?");
    params.push(parseFloat(filters.min_ctc));
  }
  if (filters.max_ctc) {
    conditions.push("CAST(REPLACE(REPLACE(c.current_ctc, ',', ''), ' ', '') AS REAL) <= ?");
    params.push(parseFloat(filters.max_ctc));
  }
  if (filters.notice_period) {
    conditions.push('c.notice_period LIKE ?');
    params.push(`%${filters.notice_period}%`);
  }

  const where = conditions.length > 0 ? `WHERE ${conditions.join(' AND ')}` : '';
  const sortBy = filters.sort_by ? `c.${filters.sort_by}` : 'c.date_added';
  const sortOrder = filters.sort_order || 'desc';
  const page = filters.page || 1;
  const perPage = filters.per_page || 50;
  const offset = (page - 1) * perPage;

  const total = (db.prepare(`SELECT COUNT(*) as count FROM candidates c ${where}`).get(...params) as { count: number }).count;

  const candidates = db.prepare(
    `SELECT c.*, d.name as department_name
    FROM candidates c
    LEFT JOIN departments d ON c.department_id = d.id
    ${where} ORDER BY ${sortBy} ${sortOrder} LIMIT ? OFFSET ?`
  ).all(...params, perPage, offset) as Candidate[];

  return { candidates, total };
}

export function getCandidate(id: string): Candidate | null {
  const db = getDb();
  return (db.prepare(`
    SELECT c.*, d.name as department_name
    FROM candidates c LEFT JOIN departments d ON c.department_id = d.id
    WHERE c.id = ?
  `).get(id) as Candidate) || null;
}

export function getCandidateByToken(token: string): Candidate | null {
  const db = getDb();
  if (!token) return null;
  return (db.prepare("SELECT c.*, d.name as department_name FROM candidates c LEFT JOIN departments d ON c.department_id = d.id WHERE c.portal_token = ? AND c.portal_token != ''").get(token) as Candidate) || null;
}

export function getCandidateByEmail(email: string): (Candidate & { password_hash?: string }) | null {
  const db = getDb();
  if (!email) return null;
  return (db.prepare("SELECT c.*, d.name as department_name FROM candidates c LEFT JOIN departments d ON c.department_id = d.id WHERE c.email = ? AND c.email != ''").get(email) as (Candidate & { password_hash?: string })) || null;
}

export function getCandidateByPhone(phone: string): (Candidate & { password_hash?: string }) | null {
  const db = getDb();
  if (!phone) return null;
  return (db.prepare("SELECT c.*, d.name as department_name FROM candidates c LEFT JOIN departments d ON c.department_id = d.id WHERE c.phone = ? AND c.phone != ''").get(phone) as (Candidate & { password_hash?: string })) || null;
}

export function getCandidatesByReferrer(referrerEmail: string): Candidate[] {
  const db = getDb();
  return db.prepare(
    "SELECT c.*, d.name as department_name FROM candidates c LEFT JOIN departments d ON c.department_id = d.id WHERE c.referrer_email = ? AND c.referrer_email != '' ORDER BY c.date_added DESC"
  ).all(referrerEmail.trim().toLowerCase()) as Candidate[];
}

export function updateCandidatePassword(id: string, passwordHash: string): boolean {
  const db = getDb();
  return db.prepare('UPDATE candidates SET password_hash = ? WHERE id = ?').run(passwordHash, id).changes > 0;
}

export function updateTeamMemberPassword(id: string, passwordHash: string): boolean {
  const db = getDb();
  return db.prepare('UPDATE team_members SET password_hash = ? WHERE id = ?').run(passwordHash, id).changes > 0;
}

export function updateCandidate(id: string, updates: Partial<Candidate>): { candidate: Candidate | null; statusChanged?: { from: string; to: string } } {
  const db = getDb();
  const fields = Object.keys(updates).filter(k => k !== 'id' && k !== 'department_name' && k !== 'posted_by_name');
  if (fields.length === 0) return { candidate: getCandidate(id) };

  // Track status change
  let statusChanged: { from: string; to: string } | undefined;
  if (updates.status) {
    const current = db.prepare('SELECT status FROM candidates WHERE id = ?').get(id) as { status: string } | undefined;
    if (current && current.status !== updates.status) {
      statusChanged = { from: current.status, to: updates.status };
      if (!fields.includes('status_changed_at')) {
        fields.push('status_changed_at');
        (updates as Record<string, unknown>).status_changed_at = new Date().toISOString();
      }
    }
  }

  const sets = fields.map(f => `${f} = ?`).join(', ');
  const values = fields.map(f => (updates as Record<string, unknown>)[f]);
  values.push(id);

  db.prepare(`UPDATE candidates SET ${sets} WHERE id = ?`).run(...values);
  logActivity(id, 'Profile Updated', `Updated: ${fields.join(', ')}`);

  if (statusChanged) {
    logActivity(id, 'Status Changed', `${statusChanged.from} → ${statusChanged.to}`);
  }

  return { candidate: getCandidate(id), statusChanged };
}

export function deleteCandidate(id: string): boolean {
  const db = getDb();
  return db.prepare('DELETE FROM candidates WHERE id = ?').run(id).changes > 0;
}

export function bulkUpdateCandidateStatus(ids: string[], status: string): number {
  const db = getDb();
  const now = new Date().toISOString();
  const placeholders = ids.map(() => '?').join(',');
  const result = db.prepare(`UPDATE candidates SET status = ?, status_changed_at = ? WHERE id IN (${placeholders})`).run(status, now, ...ids);
  for (const id of ids) {
    logActivity(id, 'Status Changed', `Bulk update to: ${status}`);
  }
  return result.changes;
}

// ═══════════════════════════════════════════════════
// ─── Activity Log ───
// ═══════════════════════════════════════════════════

export function logActivity(candidateId: string, action: string, details: string, performedBy = 'System') {
  const db = getDb();
  db.prepare(
    'INSERT INTO activity_log (id, candidate_id, action, details, performed_by, timestamp) VALUES (?, ?, ?, ?, ?, ?)'
  ).run(crypto.randomUUID(), candidateId, action, details, performedBy, new Date().toISOString());
}

export function getActivityLog(candidateId: string): ActivityLog[] {
  const db = getDb();
  return db.prepare(
    'SELECT * FROM activity_log WHERE candidate_id = ? ORDER BY timestamp DESC LIMIT 100'
  ).all(candidateId) as ActivityLog[];
}

// ═══════════════════════════════════════════════════
// ─── Remarks / Feedback ───
// ═══════════════════════════════════════════════════

export function addRemark(remark: Omit<Remark, 'id' | 'created_at'>): Remark {
  const db = getDb();
  const id = crypto.randomUUID();
  const created_at = new Date().toISOString();
  db.prepare(
    'INSERT INTO remarks (id, candidate_id, author_name, author_role, rating, comment, stage, outcome, created_at) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)'
  ).run(id, remark.candidate_id, remark.author_name, remark.author_role, remark.rating, remark.comment, remark.stage, remark.outcome || '', created_at);
  const outcomeNote = remark.outcome ? ` [${remark.outcome}]` : '';
  logActivity(remark.candidate_id, 'Remark Added', `By ${remark.author_name}${outcomeNote}: ${remark.comment.slice(0, 60)}`, remark.author_name);
  return { id, ...remark, created_at };
}

export function getRemarks(candidateId: string): Remark[] {
  const db = getDb();
  return db.prepare('SELECT * FROM remarks WHERE candidate_id = ? ORDER BY created_at DESC').all(candidateId) as Remark[];
}

/** All remarks across candidates, joined with the candidate's name. Powers the Reviews tab. */
export function getAllRemarks(filters?: { outcome?: string; stage?: string; search?: string }): (Remark & { candidate_name: string })[] {
  const db = getDb();
  const conditions: string[] = [];
  const params: unknown[] = [];
  if (filters?.outcome) { conditions.push('r.outcome = ?'); params.push(filters.outcome); }
  if (filters?.stage) { conditions.push('r.stage = ?'); params.push(filters.stage); }
  if (filters?.search) { conditions.push('(c.full_name LIKE ? OR r.author_name LIKE ?)'); params.push(`%${filters.search}%`, `%${filters.search}%`); }
  const where = conditions.length > 0 ? `WHERE ${conditions.join(' AND ')}` : '';
  return db.prepare(`
    SELECT r.*, c.full_name as candidate_name
    FROM remarks r
    LEFT JOIN candidates c ON r.candidate_id = c.id
    ${where} ORDER BY r.created_at DESC LIMIT 500
  `).all(...params) as (Remark & { candidate_name: string })[];
}

export function deleteRemark(id: string): boolean {
  const db = getDb();
  return db.prepare('DELETE FROM remarks WHERE id = ?').run(id).changes > 0;
}

// ═══════════════════════════════════════════════════
// ─── Team Members ───
// ═══════════════════════════════════════════════════

export function getTeamMembers(): TeamMember[] {
  const db = getDb();
  return db.prepare('SELECT * FROM team_members ORDER BY created_at DESC').all() as TeamMember[];
}

export function getTeamMember(id: string): TeamMember | null {
  const db = getDb();
  return (db.prepare('SELECT * FROM team_members WHERE id = ?').get(id) as TeamMember) || null;
}

export function getTeamMemberByEmail(email: string): (TeamMember & { password_hash?: string }) | null {
  const db = getDb();
  return (db.prepare('SELECT * FROM team_members WHERE email = ?').get(email) as (TeamMember & { password_hash?: string })) || null;
}

export function addTeamMember(member: Omit<TeamMember, 'id' | 'created_at'> & { password_hash?: string }): TeamMember {
  const db = getDb();
  const id = crypto.randomUUID();
  const created_at = new Date().toISOString();
  db.prepare(
    'INSERT INTO team_members (id, name, email, role, phone, department, is_active, created_at, password_hash) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)'
  ).run(id, member.name, member.email, member.role, member.phone || '', member.department || '', member.is_active ? 1 : 0, created_at, member.password_hash || '');
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

// ═══════════════════════════════════════════════════
// ─── Departments ───
// ═══════════════════════════════════════════════════

export function getDepartments(): Department[] {
  const db = getDb();
  return db.prepare('SELECT * FROM departments ORDER BY name ASC').all() as Department[];
}

export function getDepartment(id: string): Department | null {
  const db = getDb();
  return (db.prepare('SELECT * FROM departments WHERE id = ?').get(id) as Department) || null;
}

export function addDepartment(dept: Omit<Department, 'id' | 'created_at'>): Department {
  const db = getDb();
  const id = crypto.randomUUID();
  const created_at = new Date().toISOString();
  db.prepare(
    'INSERT INTO departments (id, name, description, head, is_active, created_at) VALUES (?, ?, ?, ?, ?, ?)'
  ).run(id, dept.name, dept.description || '', dept.head || '', dept.is_active ? 1 : 0, created_at);
  return { id, ...dept, created_at };
}

export function updateDepartment(id: string, updates: Partial<Department>): Department | null {
  const db = getDb();
  const fields = Object.keys(updates).filter(k => k !== 'id' && k !== 'created_at');
  if (fields.length === 0) return getDepartment(id);
  const sets = fields.map(f => `${f} = ?`).join(', ');
  const values = fields.map(f => {
    if (f === 'is_active') return (updates as Record<string, unknown>)[f] ? 1 : 0;
    return (updates as Record<string, unknown>)[f];
  });
  values.push(id);
  db.prepare(`UPDATE departments SET ${sets} WHERE id = ?`).run(...values);
  return getDepartment(id);
}

export function deleteDepartment(id: string): boolean {
  const db = getDb();
  return db.prepare('DELETE FROM departments WHERE id = ?').run(id).changes > 0;
}

// ═══════════════════════════════════════════════════
// ─── Jobs / Requisitions ───
// ═══════════════════════════════════════════════════

export function getJobs(filters?: { status?: string; department_id?: string; search?: string }): Job[] {
  const db = getDb();
  const conditions: string[] = [];
  const params: unknown[] = [];

  if (filters?.status && filters.status !== 'All') { conditions.push('j.status = ?'); params.push(filters.status); }
  if (filters?.department_id) { conditions.push('j.department_id = ?'); params.push(filters.department_id); }
  if (filters?.search) { conditions.push('(j.title LIKE ? OR j.warehouse_site LIKE ?)'); const s = `%${filters.search}%`; params.push(s, s); }

  const where = conditions.length > 0 ? `WHERE ${conditions.join(' AND ')}` : '';
  return db.prepare(`
    SELECT j.*, d.name as department_name, t.name as posted_by_name,
      (SELECT COUNT(*) FROM candidate_jobs cj WHERE cj.job_id = j.id) as candidate_count
    FROM jobs j
    LEFT JOIN departments d ON j.department_id = d.id
    LEFT JOIN team_members t ON j.posted_by = t.id
    ${where} ORDER BY j.created_at DESC
  `).all(...params) as Job[];
}

export function getJob(id: string): Job | null {
  const db = getDb();
  return (db.prepare(`
    SELECT j.*, d.name as department_name, t.name as posted_by_name,
      (SELECT COUNT(*) FROM candidate_jobs cj WHERE cj.job_id = j.id) as candidate_count
    FROM jobs j
    LEFT JOIN departments d ON j.department_id = d.id
    LEFT JOIN team_members t ON j.posted_by = t.id
    WHERE j.id = ?
  `).get(id) as Job) || null;
}

export function addJob(job: Omit<Job, 'id' | 'created_at' | 'updated_at' | 'department_name' | 'posted_by_name' | 'candidate_count'>): Job {
  const db = getDb();
  const id = crypto.randomUUID();
  const now = new Date().toISOString();
  db.prepare(`
    INSERT INTO jobs (id, title, department_id, posted_by, num_positions, warehouse_site,
      expected_salary_min, expected_salary_max, description, requirements, status, priority, created_at, updated_at)
    VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
  `).run(id, job.title, job.department_id || '', job.posted_by || '', job.num_positions || 1,
    job.warehouse_site || '', job.expected_salary_min || '', job.expected_salary_max || '',
    job.description || '', job.requirements || '', job.status || 'Open', job.priority || 'Normal', now, now);
  return getJob(id)!;
}

export function updateJob(id: string, updates: Partial<Job>): Job | null {
  const db = getDb();
  const fields = Object.keys(updates).filter(k => !['id', 'created_at', 'department_name', 'posted_by_name', 'candidate_count'].includes(k));
  if (fields.length === 0) return getJob(id);
  if (!fields.includes('updated_at')) { fields.push('updated_at'); (updates as Record<string, unknown>).updated_at = new Date().toISOString(); }
  const sets = fields.map(f => `${f} = ?`).join(', ');
  const values = fields.map(f => (updates as Record<string, unknown>)[f]);
  values.push(id);
  db.prepare(`UPDATE jobs SET ${sets} WHERE id = ?`).run(...values);
  return getJob(id);
}

export function deleteJob(id: string): boolean {
  const db = getDb();
  return db.prepare('DELETE FROM jobs WHERE id = ?').run(id).changes > 0;
}

export function getOpenJobs(): Job[] {
  return getJobs({ status: 'Open' });
}

// Candidate-Job linking
export function linkCandidateToJob(candidateId: string, jobId: string): CandidateJob {
  const db = getDb();
  const id = crypto.randomUUID();
  const now = new Date().toISOString();
  db.prepare('INSERT OR IGNORE INTO candidate_jobs (id, candidate_id, job_id, applied_at, status) VALUES (?, ?, ?, ?, ?)').run(id, candidateId, jobId, now, 'Applied');
  logActivity(candidateId, 'Applied to Job', `Applied to job ${jobId}`);
  return { id, candidate_id: candidateId, job_id: jobId, applied_at: now, status: 'Applied' };
}

export function getJobCandidates(jobId: string): (Candidate & { applied_at: string; application_status: string })[] {
  const db = getDb();
  return db.prepare(`
    SELECT c.*, cj.applied_at, cj.status as application_status, d.name as department_name
    FROM candidate_jobs cj
    JOIN candidates c ON cj.candidate_id = c.id
    LEFT JOIN departments d ON c.department_id = d.id
    WHERE cj.job_id = ?
    ORDER BY cj.applied_at DESC
  `).all(jobId) as (Candidate & { applied_at: string; application_status: string })[];
}

export function getCandidateJobs(candidateId: string): (Job & { applied_at: string; application_status: string })[] {
  const db = getDb();
  return db.prepare(`
    SELECT j.*, cj.applied_at, cj.status as application_status, d.name as department_name
    FROM candidate_jobs cj
    JOIN jobs j ON cj.job_id = j.id
    LEFT JOIN departments d ON j.department_id = d.id
    WHERE cj.candidate_id = ?
    ORDER BY cj.applied_at DESC
  `).all(candidateId) as (Job & { applied_at: string; application_status: string })[];
}

export function unlinkCandidateFromJob(candidateId: string, jobId: string): boolean {
  const db = getDb();
  return db.prepare('DELETE FROM candidate_jobs WHERE candidate_id = ? AND job_id = ?').run(candidateId, jobId).changes > 0;
}

// ═══════════════════════════════════════════════════
// ─── Interviews ───
// ═══════════════════════════════════════════════════

export function getInterviews(filters?: { candidate_id?: string; job_id?: string; status?: string; upcoming?: boolean }): Interview[] {
  const db = getDb();
  const conditions: string[] = [];
  const params: unknown[] = [];

  if (filters?.candidate_id) { conditions.push('i.candidate_id = ?'); params.push(filters.candidate_id); }
  if (filters?.job_id) { conditions.push('i.job_id = ?'); params.push(filters.job_id); }
  if (filters?.status) { conditions.push('i.status = ?'); params.push(filters.status); }
  if (filters?.upcoming) { conditions.push("i.scheduled_at >= ? AND i.status = 'Scheduled'"); params.push(new Date().toISOString()); }

  const where = conditions.length > 0 ? `WHERE ${conditions.join(' AND ')}` : '';
  return db.prepare(`
    SELECT i.*, c.full_name as candidate_name, j.title as job_title, t.name as interviewer_name
    FROM interviews i
    LEFT JOIN candidates c ON i.candidate_id = c.id
    LEFT JOIN jobs j ON i.job_id = j.id
    LEFT JOIN team_members t ON i.interviewer_id = t.id
    ${where} ORDER BY i.scheduled_at ASC
  `).all(...params) as Interview[];
}

export function getInterview(id: string): Interview | null {
  const db = getDb();
  return (db.prepare(`
    SELECT i.*, c.full_name as candidate_name, j.title as job_title, t.name as interviewer_name
    FROM interviews i
    LEFT JOIN candidates c ON i.candidate_id = c.id
    LEFT JOIN jobs j ON i.job_id = j.id
    LEFT JOIN team_members t ON i.interviewer_id = t.id
    WHERE i.id = ?
  `).get(id) as Interview) || null;
}

export function addInterview(interview: Omit<Interview, 'id' | 'created_at' | 'candidate_name' | 'job_title' | 'interviewer_name'>): Interview {
  const db = getDb();
  const id = crypto.randomUUID();
  const now = new Date().toISOString();
  db.prepare(`
    INSERT INTO interviews (id, candidate_id, job_id, interviewer_id, scheduled_at, duration, type, location, notes, status, created_at)
    VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
  `).run(id, interview.candidate_id, interview.job_id || '', interview.interviewer_id || '',
    interview.scheduled_at, interview.duration || 60, interview.type || 'Video Call',
    interview.location || '', interview.notes || '', interview.status || 'Scheduled', now);
  logActivity(interview.candidate_id, 'Interview Scheduled', `${interview.type} on ${interview.scheduled_at}`);
  return getInterview(id)!;
}

export function updateInterview(id: string, updates: Partial<Interview>): Interview | null {
  const db = getDb();
  const fields = Object.keys(updates).filter(k => !['id', 'created_at', 'candidate_name', 'job_title', 'interviewer_name'].includes(k));
  if (fields.length === 0) return getInterview(id);
  const sets = fields.map(f => `${f} = ?`).join(', ');
  const values = fields.map(f => (updates as Record<string, unknown>)[f]);
  values.push(id);
  db.prepare(`UPDATE interviews SET ${sets} WHERE id = ?`).run(...values);
  return getInterview(id);
}

export function deleteInterview(id: string): boolean {
  const db = getDb();
  return db.prepare('DELETE FROM interviews WHERE id = ?').run(id).changes > 0;
}

// ═══════════════════════════════════════════════════
// ─── Scorecards ───
// ═══════════════════════════════════════════════════

export function getScorecards(interviewId: string): Scorecard[] {
  const db = getDb();
  const rows = db.prepare('SELECT * FROM scorecards WHERE interview_id = ? ORDER BY created_at DESC').all(interviewId) as (Omit<Scorecard, 'attributes'> & { attributes: string })[];
  return rows.map(r => ({ ...r, attributes: JSON.parse(r.attributes || '[]') }));
}

export function addScorecard(sc: Omit<Scorecard, 'id' | 'created_at'>): Scorecard {
  const db = getDb();
  const id = crypto.randomUUID();
  const now = new Date().toISOString();
  db.prepare(`
    INSERT INTO scorecards (id, interview_id, evaluator_id, evaluator_name, overall_rating, recommendation, notes, attributes, created_at)
    VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)
  `).run(id, sc.interview_id, sc.evaluator_id || '', sc.evaluator_name || '', sc.overall_rating || 0,
    sc.recommendation || '', sc.notes || '', JSON.stringify(sc.attributes || []), now);
  return { id, ...sc, created_at: now };
}

export function deleteScorecard(id: string): boolean {
  const db = getDb();
  return db.prepare('DELETE FROM scorecards WHERE id = ?').run(id).changes > 0;
}

// ═══════════════════════════════════════════════════
// ─── Offer Templates ───
// ═══════════════════════════════════════════════════

export function getOfferTemplates(): OfferTemplate[] {
  const db = getDb();
  const rows = db.prepare('SELECT * FROM offer_templates ORDER BY created_at DESC').all() as (Omit<OfferTemplate, 'variables' | 'is_active'> & { variables: string; is_active: number })[];
  return rows.map(r => ({ ...r, variables: JSON.parse(r.variables || '[]'), is_active: !!r.is_active }));
}

export function addOfferTemplate(t: Omit<OfferTemplate, 'id' | 'created_at'>): OfferTemplate {
  const db = getDb();
  const id = crypto.randomUUID();
  const now = new Date().toISOString();
  db.prepare('INSERT INTO offer_templates (id, name, body, variables, is_active, created_at) VALUES (?, ?, ?, ?, ?, ?)').run(
    id, t.name, t.body, JSON.stringify(t.variables || []), t.is_active ? 1 : 0, now
  );
  return { id, ...t, created_at: now };
}

export function updateOfferTemplate(id: string, updates: Partial<OfferTemplate>): OfferTemplate | null {
  const db = getDb();
  const fields = Object.keys(updates).filter(k => k !== 'id' && k !== 'created_at');
  if (fields.length === 0) return null;
  const sets = fields.map(f => `${f} = ?`).join(', ');
  const values = fields.map(f => {
    if (f === 'variables') return JSON.stringify((updates as Record<string, unknown>)[f]);
    if (f === 'is_active') return (updates as Record<string, unknown>)[f] ? 1 : 0;
    return (updates as Record<string, unknown>)[f];
  });
  values.push(id);
  db.prepare(`UPDATE offer_templates SET ${sets} WHERE id = ?`).run(...values);
  const row = db.prepare('SELECT * FROM offer_templates WHERE id = ?').get(id) as { variables: string; is_active: number } & Record<string, unknown>;
  return { ...row, variables: JSON.parse(row.variables || '[]'), is_active: !!row.is_active } as unknown as OfferTemplate;
}

export function deleteOfferTemplate(id: string): boolean {
  const db = getDb();
  return db.prepare('DELETE FROM offer_templates WHERE id = ?').run(id).changes > 0;
}

// ═══════════════════════════════════════════════════
// ─── Workflow Rules ───
// ═══════════════════════════════════════════════════

export function getWorkflowRules(): (WorkflowRule & { template_name?: string })[] {
  const db = getDb();
  return db.prepare(`
    SELECT w.*, e.name as template_name
    FROM workflow_rules w
    LEFT JOIN email_templates e ON w.template_id = e.id
    ORDER BY w.created_at DESC
  `).all() as (WorkflowRule & { template_name?: string })[];
}

export function addWorkflowRule(rule: Omit<WorkflowRule, 'id' | 'created_at' | 'template_name'>): WorkflowRule {
  const db = getDb();
  const id = crypto.randomUUID();
  const now = new Date().toISOString();
  db.prepare('INSERT INTO workflow_rules (id, from_status, to_status, template_id, is_active, created_at) VALUES (?, ?, ?, ?, ?, ?)').run(
    id, rule.from_status, rule.to_status, rule.template_id || '', rule.is_active ? 1 : 0, now
  );
  return { id, ...rule, created_at: now };
}

export function updateWorkflowRule(id: string, updates: Partial<WorkflowRule>): WorkflowRule | null {
  const db = getDb();
  const fields = Object.keys(updates).filter(k => k !== 'id' && k !== 'created_at' && k !== 'template_name');
  if (fields.length === 0) return null;
  const sets = fields.map(f => `${f} = ?`).join(', ');
  const values = fields.map(f => {
    if (f === 'is_active') return (updates as Record<string, unknown>)[f] ? 1 : 0;
    return (updates as Record<string, unknown>)[f];
  });
  values.push(id);
  db.prepare(`UPDATE workflow_rules SET ${sets} WHERE id = ?`).run(...values);
  return db.prepare('SELECT * FROM workflow_rules WHERE id = ?').get(id) as WorkflowRule;
}

export function deleteWorkflowRule(id: string): boolean {
  const db = getDb();
  return db.prepare('DELETE FROM workflow_rules WHERE id = ?').run(id).changes > 0;
}

export function getActiveRulesForTransition(fromStatus: string, toStatus: string): (WorkflowRule & { template_name?: string; template_subject?: string; template_body?: string })[] {
  const db = getDb();
  return db.prepare(`
    SELECT w.*, e.name as template_name, e.subject as template_subject, e.body as template_body
    FROM workflow_rules w
    LEFT JOIN email_templates e ON w.template_id = e.id
    WHERE w.from_status = ? AND w.to_status = ? AND w.is_active = 1
  `).all(fromStatus, toStatus) as (WorkflowRule & { template_name?: string; template_subject?: string; template_body?: string })[];
}

// ═══════════════════════════════════════════════════
// ─── Email Templates (Enhanced) ───
// ═══════════════════════════════════════════════════

export function getEmailTemplates(): EmailTemplate[] {
  const db = getDb();
  return db.prepare('SELECT * FROM email_templates ORDER BY type, name').all() as EmailTemplate[];
}

export function getEmailTemplate(id: string): EmailTemplate | null {
  const db = getDb();
  return (db.prepare('SELECT * FROM email_templates WHERE id = ?').get(id) as EmailTemplate) || null;
}

export function addEmailTemplate(template: Omit<EmailTemplate, 'id'>): EmailTemplate {
  const db = getDb();
  const id = crypto.randomUUID();
  db.prepare('INSERT INTO email_templates (id, name, subject, body, type, category) VALUES (?, ?, ?, ?, ?, ?)').run(
    id, template.name, template.subject, template.body, template.type, template.category || 'general'
  );
  return { id, ...template };
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

export function deleteEmailTemplate(id: string): boolean {
  const db = getDb();
  return db.prepare('DELETE FROM email_templates WHERE id = ?').run(id).changes > 0;
}

// ═══════════════════════════════════════════════════
// ─── Stats / Analytics ───
// ═══════════════════════════════════════════════════

export function getStats(): DashboardStats {
  const db = getDb();
  const total = (db.prepare('SELECT COUNT(*) as count FROM candidates').get() as { count: number }).count;

  const oneWeekAgo = new Date();
  oneWeekAgo.setDate(oneWeekAgo.getDate() - 7);
  const newThisWeek = (db.prepare('SELECT COUNT(*) as count FROM candidates WHERE date_added >= ?').get(oneWeekAgo.toISOString()) as { count: number }).count;

  const statusCounts = db.prepare("SELECT status, COUNT(*) as count FROM candidates GROUP BY status").all() as { status: string; count: number }[];
  const getCount = (status: string) => statusCounts.find(s => s.status === status)?.count || 0;

  const sources = db.prepare("SELECT source, COUNT(*) as count FROM candidates GROUP BY source ORDER BY count DESC").all() as { source: string; count: number }[];

  const recent = db.prepare(`
    SELECT c.*, d.name as department_name FROM candidates c
    LEFT JOIN departments d ON c.department_id = d.id
    ORDER BY c.date_added DESC LIMIT 10
  `).all() as Candidate[];

  // Source conversion rates
  const sourceConversion = db.prepare(`
    SELECT source, COUNT(*) as total,
      SUM(CASE WHEN status NOT IN ('New', 'Rejected') THEN 1 ELSE 0 END) as advanced
    FROM candidates GROUP BY source
  `).all() as { source: string; total: number; advanced: number }[];

  // Pipeline velocity (avg days in each stage)
  const velocity = db.prepare(`
    SELECT status,
      ROUND(AVG(JULIANDAY('now') - JULIANDAY(COALESCE(NULLIF(status_changed_at,''), date_added))), 1) as avg_days
    FROM candidates WHERE status NOT IN ('Hired', 'Rejected')
    GROUP BY status
  `).all() as { status: string; avg_days: number }[];

  return {
    total_candidates: total,
    new_this_week: newThisWeek,
    contacted: getCount('Contacted'),
    screening: getCount('Screening'),
    interviewing: getCount('Interviewing'),
    offered: getCount('Offered'),
    hired: getCount('Hired'),
    rejected: getCount('Rejected'),
    on_hold: getCount('On Hold'),
    sources,
    recent_candidates: recent,
    pipeline_velocity: velocity,
    source_conversion: sourceConversion.map(s => ({ ...s, rate: s.total > 0 ? Math.round((s.advanced / s.total) * 100) : 0 })),
  };
}

// ═══════════════════════════════════════════════════
// ─── Search (Global) ───
// ═══════════════════════════════════════════════════

export function globalSearch(query: string): { candidates: Candidate[]; jobs: Job[]; team: TeamMember[] } {
  const db = getDb();
  const s = `%${query}%`;

  const candidates = db.prepare(`
    SELECT c.*, d.name as department_name FROM candidates c
    LEFT JOIN departments d ON c.department_id = d.id
    WHERE c.full_name LIKE ? OR c.email LIKE ? OR c.phone LIKE ? OR c.current_employer LIKE ?
    ORDER BY c.date_added DESC LIMIT 8
  `).all(s, s, s, s) as Candidate[];

  const jobs = db.prepare(`
    SELECT j.*, d.name as department_name FROM jobs j
    LEFT JOIN departments d ON j.department_id = d.id
    WHERE j.title LIKE ? OR j.warehouse_site LIKE ? OR j.description LIKE ?
    ORDER BY j.created_at DESC LIMIT 5
  `).all(s, s, s) as Job[];

  const team = db.prepare(`
    SELECT * FROM team_members WHERE name LIKE ? OR email LIKE ?
    ORDER BY created_at DESC LIMIT 5
  `).all(s, s) as TeamMember[];

  return { candidates, jobs, team };
}

// ═══════════════════════════════════════════════════
// ─── Export ───
// ═══════════════════════════════════════════════════

export function exportCandidatesCSV(filters: FilterParams): string {
  const { candidates } = getCandidates({ ...filters, per_page: 100000 });
  const headers = [
    'Full Name', 'Phone', 'Email', 'Current Location', 'Current Employer',
    'Current Designation', 'Department', 'Notice Period', 'Current CTC', 'Expected CTC',
    'Source', 'Date Added', 'Status', 'Referrer Name'
  ];
  const rows = candidates.map(c => [
    c.full_name, c.phone, c.email, c.current_location, c.current_employer,
    c.current_designation, c.department_name || '', c.notice_period, c.current_ctc, c.expected_ctc,
    c.source, c.date_added, c.status, c.referrer_name
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
