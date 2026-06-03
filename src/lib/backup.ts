import fs from 'fs';
import path from 'path';
import { backupDatabase, DATA_DIR } from './db';

const BACKUP_DIR = path.join(DATA_DIR, 'backups');
const RETENTION = Number(process.env.BACKUP_RETENTION || 14); // keep last N snapshots
const INTERVAL_HOURS = Number(process.env.BACKUP_INTERVAL_HOURS || 24);

let scheduled = false;

export interface BackupInfo {
  file: string;
  size: number;
  created_at: string;
}

/** Run a single backup snapshot and prune old ones. Returns the new file path. */
export async function runBackup(): Promise<string> {
  fs.mkdirSync(BACKUP_DIR, { recursive: true });
  const stamp = new Date().toISOString().replace(/[:.]/g, '-');
  const dest = path.join(BACKUP_DIR, `ats-${stamp}.db`);
  await backupDatabase(dest);
  pruneOldBackups();
  return dest;
}

/** List existing backups, newest first. */
export function listBackups(): BackupInfo[] {
  if (!fs.existsSync(BACKUP_DIR)) return [];
  return fs.readdirSync(BACKUP_DIR)
    .filter(f => f.startsWith('ats-') && f.endsWith('.db'))
    .map(f => {
      const stat = fs.statSync(path.join(BACKUP_DIR, f));
      return { file: f, size: stat.size, created_at: stat.mtime.toISOString() };
    })
    .sort((a, b) => b.created_at.localeCompare(a.created_at));
}

function pruneOldBackups() {
  const all = listBackups();
  for (const old of all.slice(RETENTION)) {
    try { fs.unlinkSync(path.join(BACKUP_DIR, old.file)); } catch { /* ignore */ }
  }
}

/** Start the periodic backup loop. Idempotent — safe to call once at boot. */
export function scheduleBackups() {
  if (scheduled) return;
  scheduled = true;

  const tick = () => {
    runBackup()
      .then(p => console.log(`[backup] snapshot written: ${p}`))
      .catch(e => console.error('[backup] failed:', e));
  };

  // Initial snapshot shortly after boot, then every INTERVAL_HOURS.
  setTimeout(tick, 30_000);
  setInterval(tick, INTERVAL_HOURS * 60 * 60 * 1000);
  console.log(`[backup] scheduled every ${INTERVAL_HOURS}h, retaining ${RETENTION} snapshots in ${BACKUP_DIR}`);
}
