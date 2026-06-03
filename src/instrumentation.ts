// Runs once when the server process starts (Next.js instrumentation hook).
export async function register() {
  // Only in the Node.js server runtime (not Edge/middleware), and only in
  // production by default. Set ENABLE_BACKUPS=true to force it on locally.
  if (process.env.NEXT_RUNTIME !== 'nodejs') return;
  if (process.env.NODE_ENV !== 'production' && process.env.ENABLE_BACKUPS !== 'true') return;

  const { scheduleBackups } = await import('./lib/backup');
  scheduleBackups();

  // Inbound resume email ingestion. Self-skips if no IMAP/SMTP credentials.
  const { scheduleEmailIngest } = await import('./lib/email-ingest');
  scheduleEmailIngest();
}
