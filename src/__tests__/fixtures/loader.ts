import { execSync } from 'child_process';
import * as fs from 'fs';
import * as path from 'path';

const SNAPSHOT_PATH = path.join(__dirname, 'snapshot.sql');

let snapshotLoaded = false;

export async function loadSnapshot(): Promise<void> {
  if (snapshotLoaded) {
    return;
  }

  const databaseUrl = process.env.DATABASE_URL;
  if (!databaseUrl) {
    throw new Error('DATABASE_URL is not set');
  }

  if (!fs.existsSync(SNAPSHOT_PATH)) {
    throw new Error(
      `Snapshot file not found: ${SNAPSHOT_PATH}\n` +
        'Run: npm run fixtures:snapshot to generate it.',
    );
  }

  execSync(`psql "${databaseUrl}" < "${SNAPSHOT_PATH}"`, {
    encoding: 'utf-8',
    stdio: 'pipe',
  });

  snapshotLoaded = true;
}

export function resetSnapshotLoadedState(): void {
  snapshotLoaded = false;
}

export function isSnapshotLoaded(): boolean {
  return snapshotLoaded;
}
