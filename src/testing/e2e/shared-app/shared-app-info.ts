import * as fs from 'node:fs';
import * as os from 'node:os';
import * as path from 'node:path';

// globalSetup owns the run and sets REVISIUM_TEST_APP_INFO_FILE before
// any workers fork; workers inherit it through env. A fixed tmpdir
// filename would let concurrent jest runs on the same host overwrite
// each other's handoff.
const FILE =
  process.env.REVISIUM_TEST_APP_INFO_FILE ??
  path.join(os.tmpdir(), `revisium-test-shared-app-${process.pid}.json`);

export interface SharedAppInfo {
  port: number;
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
