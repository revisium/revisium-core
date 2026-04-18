import * as fs from 'node:fs';
import * as os from 'node:os';
import * as path from 'node:path';

const FILE = path.join(os.tmpdir(), 'revisium-test-shared-app.json');

export interface SharedAppInfo {
  port: number;
  pid: number;
  jwtSecret: string;
}

export function writeSharedAppInfo(info: SharedAppInfo): void {
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
