import { ImapFlow } from 'imapflow';
import { simpleParser } from 'mailparser';
import { isEmailProcessed, markEmailProcessed } from './db';
import { ingestResume, isResumeAttachment } from './resume-ingest';

// IMAP connection — reuses the SMTP (Google App Password) credentials by default.
const IMAP_HOST = process.env.IMAP_HOST || 'imap.gmail.com';
const IMAP_PORT = Number(process.env.IMAP_PORT || 993);
const IMAP_USER = process.env.IMAP_USER || process.env.SMTP_USER || '';
const IMAP_PASS = process.env.IMAP_PASS || process.env.SMTP_PASS || '';
const MAILBOX = process.env.IMAP_MAILBOX || 'INBOX';

const POLL_MINUTES = Number(process.env.EMAIL_POLL_MINUTES || 5);
const SINCE_DAYS = Number(process.env.EMAIL_INGEST_SINCE_DAYS || 3);
const MAX_PER_POLL = Number(process.env.EMAIL_INGEST_MAX_PER_POLL || 25);
const MAX_ATTACHMENT_BYTES = Number(process.env.EMAIL_MAX_ATTACHMENT_MB || 15) * 1024 * 1024;

// Once-a-day deep sweep: re-scans a wider window with a higher cap so a busy
// day can't leave any unprocessed resume behind. Dedupe by Message-ID makes the
// overlap with the frequent poll harmless.
const DAILY_SWEEP = (process.env.EMAIL_DAILY_SWEEP ?? 'true') !== 'false';
const DAILY_SWEEP_HOUR = Number(process.env.EMAIL_DAILY_SWEEP_HOUR ?? 6); // server (UTC) hour
const DAILY_SINCE_DAYS = Number(process.env.EMAIL_DAILY_SINCE_DAYS || 7);
const DAILY_MAX = Number(process.env.EMAIL_DAILY_MAX || 200);

// If the email's SUBJECT clearly says it's a resume/CV, trust the human signal
// and import the attachment even if the document classifier is unsure.
const SUBJECT_RESUME_RE =
  /(resume|\bcv\b|bio[\s_-]?data|curriculum\s*vitae|job\s*application|applying\s*for|application\s*for|profile)/i;

let scheduled = false;
let running = false;

export function isEmailIngestConfigured(): boolean {
  return !!(IMAP_USER && IMAP_PASS);
}

export interface IngestRunResult {
  scanned: number;
  emailsProcessed: number;
  candidatesAdded: number;
  skipped: number;
  errors: number;
}

export interface PollOptions {
  /** How many days back to search the inbox. */
  sinceDays?: number;
  /** Max number of unprocessed emails to handle in this run. */
  maxPerPoll?: number;
}

/** Connect to the inbox once, import resumes from new messages, dedupe by Message-ID. */
export async function pollInboxOnce(opts: PollOptions = {}): Promise<IngestRunResult> {
  const result: IngestRunResult = { scanned: 0, emailsProcessed: 0, candidatesAdded: 0, skipped: 0, errors: 0 };

  const sinceDays = opts.sinceDays ?? SINCE_DAYS;
  const maxPerPoll = opts.maxPerPoll ?? MAX_PER_POLL;

  if (!isEmailIngestConfigured()) {
    throw new Error('Email ingest not configured. Set SMTP_USER/SMTP_PASS (or IMAP_USER/IMAP_PASS).');
  }
  if (running) return result; // avoid overlapping runs
  running = true;

  const client = new ImapFlow({
    host: IMAP_HOST,
    port: IMAP_PORT,
    secure: true,
    auth: { user: IMAP_USER, pass: IMAP_PASS },
    logger: false,
  });

  try {
    await client.connect();
    const lock = await client.getMailboxLock(MAILBOX);
    try {
      const since = new Date(Date.now() - sinceDays * 86400000);
      const uids = (await client.search({ since }, { uid: true })) || [];

      // Cheap envelope-only pass (newest first) so we can skip already-processed
      // emails BEFORE capping. This stops a burst of newer mail from burying an
      // older, still-unprocessed CV behind the per-poll limit.
      const newestFirst = [...uids].sort((a, b) => b - a);
      const pending: number[] = [];
      for (const uid of newestFirst) {
        if (pending.length >= maxPerPoll) break;
        try {
          const env = await client.fetchOne(String(uid), { envelope: true }, { uid: true });
          const messageId = (env && env.envelope?.messageId) || `${MAILBOX}:${uid}`;
          if (isEmailProcessed(messageId)) continue;
          pending.push(uid);
        } catch {
          // If the envelope fetch fails, still queue it for a full attempt below.
          pending.push(uid);
        }
      }

      for (const uid of pending) {
        result.scanned++;
        try {
          const msg = await client.fetchOne(String(uid), { source: true, envelope: true }, { uid: true });
          if (!msg || !msg.source) continue;

          const messageId =
            msg.envelope?.messageId || `${MAILBOX}:${uid}`;
          if (isEmailProcessed(messageId)) continue;

          const parsed = await simpleParser(msg.source);
          const fromAddress = parsed.from?.value?.[0]?.address || '';
          const fromName = parsed.from?.value?.[0]?.name || '';
          const subject = parsed.subject || '';

          const attachments = (parsed.attachments || []).filter(
            (a) =>
              a.content &&
              a.content.length > 0 &&
              a.content.length <= MAX_ATTACHMENT_BYTES &&
              isResumeAttachment(a.filename || '', a.contentType),
          );

          // A subject that explicitly says "Resume"/"CV"/"job application" is a
          // strong human signal — trust it and import even if the document
          // classifier is unsure (avoids missing genuine CVs).
          const subjectSaysResume = SUBJECT_RESUME_RE.test(subject);

          if (attachments.length > 0) {
            console.log(
              `[email-ingest] "${subject}" from ${fromAddress} — ${attachments.length} resume-like attachment(s): ${attachments
                .map((a) => a.filename || 'unnamed')
                .join(', ')}${subjectSaysResume ? ' [subject indicates resume]' : ''}`,
            );
          }

          let added = 0;
          for (const att of attachments) {
            try {
              const r = await ingestResume(att.content as Buffer, att.filename || 'resume', {
                source: 'Email Inbox',
                referrer_name: fromName,
                referrer_email: fromAddress,
                notes: `Auto-imported from email "${subject}" (${fromAddress})`,
                requireResume: !subjectSaysResume,
              });
              if ('skipped' in r) {
                result.skipped++;
                console.log(`[email-ingest] skipped "${att.filename}" (${r.reason}).`);
              } else {
                added++;
              }
            } catch (e) {
              result.errors++;
              console.error('[email-ingest] failed to ingest attachment:', (e as Error).message);
            }
          }

          markEmailProcessed({
            message_id: messageId,
            from_address: fromAddress,
            subject,
            attachments: attachments.length,
            candidates_added: added,
          });

          result.emailsProcessed++;
          result.candidatesAdded += added;
        } catch (e) {
          result.errors++;
          console.error('[email-ingest] error processing message:', (e as Error).message);
        }
      }
    } finally {
      lock.release();
    }
    await client.logout();
  } catch (e) {
    result.errors++;
    console.error('[email-ingest] connection/poll failed:', (e as Error).message);
    try { await client.close(); } catch { /* ignore */ }
    throw e;
  } finally {
    running = false;
  }

  return result;
}

/** Start the periodic inbox poll. Idempotent — safe to call once at boot. */
export function scheduleEmailIngest(): void {
  if (scheduled) return;
  if (!isEmailIngestConfigured()) {
    console.log('[email-ingest] not configured (no IMAP/SMTP credentials) — skipping.');
    return;
  }
  scheduled = true;

  const tick = () => {
    pollInboxOnce()
      .then((r) => {
        if (r.scanned > 0 || r.candidatesAdded > 0) {
          console.log(`[email-ingest] scanned=${r.scanned} emails=${r.emailsProcessed} candidates+=${r.candidatesAdded} skipped=${r.skipped} errors=${r.errors}`);
        }
      })
      .catch((e) => console.error('[email-ingest] poll failed:', e instanceof Error ? e.message : e));
  };

  setTimeout(tick, 45_000); // shortly after boot
  setInterval(tick, POLL_MINUTES * 60 * 1000);
  console.log(`[email-ingest] scheduled every ${POLL_MINUTES}m from ${IMAP_HOST} (${MAILBOX}).`);

  // Once-a-day deep sweep with a wider lookback so nothing is ever missed.
  if (DAILY_SWEEP) {
    const deepSweep = () => {
      console.log(`[email-ingest] running daily deep sweep (last ${DAILY_SINCE_DAYS} days, up to ${DAILY_MAX} emails)...`);
      pollInboxOnce({ sinceDays: DAILY_SINCE_DAYS, maxPerPoll: DAILY_MAX })
        .then((r) =>
          console.log(`[email-ingest] daily sweep: scanned=${r.scanned} emails=${r.emailsProcessed} candidates+=${r.candidatesAdded} skipped=${r.skipped} errors=${r.errors}`),
        )
        .catch((e) => console.error('[email-ingest] daily sweep failed:', e instanceof Error ? e.message : e));
    };

    // Fire at the next DAILY_SWEEP_HOUR (server/UTC), then every 24h.
    const now = new Date();
    const next = new Date(now);
    next.setUTCHours(DAILY_SWEEP_HOUR, 0, 0, 0);
    if (next <= now) next.setUTCDate(next.getUTCDate() + 1);
    const delay = next.getTime() - now.getTime();
    setTimeout(() => {
      deepSweep();
      setInterval(deepSweep, 24 * 60 * 60 * 1000);
    }, delay);
    console.log(`[email-ingest] daily deep sweep scheduled for ${String(DAILY_SWEEP_HOUR).padStart(2, '0')}:00 UTC.`);
  }
}
