import * as fs from 'node:fs';
import * as path from 'node:path';

// Project-local path (under .jest-cache/, which is gitignored) so
// concurrent jest runs in different checkouts don't collide on a
// shared /tmp filename, and so workers can compute the same path
// without globalSetup having to forward it through env.
const FILE = path.join(process.cwd(), '.jest-cache', 'shared-app.json');

export interface SharedAppInfo {
  port: number;
  jwtSecret: string;
}

export function writeSharedAppInfo(info: SharedAppInfo): void {
  fs.mkdirSync(path.dirname(FILE), { recursive: true });
  fs.writeFileSync(FILE, JSON.stringify(info), 'utf8');
}

export function readSharedAppInfo(): SharedAppInfo | null {
  try {
    const raw = fs.readFileSync(FILE, 'utf8');
    return JSON.parse(raw) as SharedAppInfo;
  } catch {
    return null;
  }
}

export function deleteSharedAppInfo(): void {
  try {
    fs.unlinkSync(FILE);
  } catch {
    // ignore
  }
}
