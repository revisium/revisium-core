import * as fs from 'node:fs';
import * as path from 'node:path';

/**
 * Per-run handoff filename. globalSetup runs in the jest main process;
 * workers are forked children, so `process.ppid` inside a worker equals
 * the main process's `process.pid`. Both sides compute the same path
 * without having to forward a value through env (which can't be done
 * reliably because this module is imported before globalSetup mutates
 * env).
 */
function resolveFile(): string {
  const isWorker = process.env.JEST_WORKER_ID !== undefined;
  const runPid = isWorker ? process.ppid : process.pid;
  return path.join(process.cwd(), '.jest-cache', `shared-app-${runPid}.json`);
}

const LOCK_FILE = path.join(process.cwd(), '.jest-cache', 'shared-app.lock');

export interface SharedAppInfo {
  port: number;
  jwtSecret: string;
}

export function writeSharedAppInfo(info: SharedAppInfo): void {
  const file = resolveFile();
  fs.mkdirSync(path.dirname(file), { recursive: true });
  fs.writeFileSync(file, JSON.stringify(info), 'utf8');
}

export function readSharedAppInfo(): SharedAppInfo | null {
  try {
    const raw = fs.readFileSync(resolveFile(), 'utf8');
    return JSON.parse(raw) as SharedAppInfo;
  } catch {
    return null;
  }
}

export function deleteSharedAppInfo(): void {
  try {
    fs.unlinkSync(resolveFile());
  } catch {
    // ignore
  }
}

/**
 * Advisory lock to detect concurrent jest runs in the same checkout.
 * On contention, globalSetup should error early rather than silently
 * overwrite a sibling run's handoff file.
 */
export function acquireRunLock(): void {
  fs.mkdirSync(path.dirname(LOCK_FILE), { recursive: true });
  try {
    const fd = fs.openSync(LOCK_FILE, 'wx');
    fs.writeFileSync(fd, String(process.pid));
    fs.closeSync(fd);
  } catch {
    const existingPid = Number(fs.readFileSync(LOCK_FILE, 'utf8').trim());
    const existingAlive =
      Number.isFinite(existingPid) && isPidAlive(existingPid);
    if (existingAlive) {
      throw new Error(
        `Another jest run (pid ${existingPid}) is active in this checkout. ` +
          `If this is a stale lock, delete ${LOCK_FILE}.`,
      );
    }
    // Stale lock — claim it.
    fs.writeFileSync(LOCK_FILE, String(process.pid));
  }
}

export function releaseRunLock(): void {
  try {
    const owner = Number(fs.readFileSync(LOCK_FILE, 'utf8').trim());
    if (owner === process.pid) {
      fs.unlinkSync(LOCK_FILE);
    }
  } catch {
    // ignore
  }
}

function isPidAlive(pid: number): boolean {
  try {
    process.kill(pid, 0);
    return true;
  } catch {
    return false;
  }
}
