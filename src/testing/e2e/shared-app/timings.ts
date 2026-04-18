import * as fs from 'node:fs';
import * as os from 'node:os';
import * as path from 'node:path';

/**
 * Opt-in (`TEST_TIMINGS=1`) fine-grained test-timing collector. Every
 * worker appends one jsonl line per observed event to a shared tempfile;
 * `globalTeardown` reads it and prints a per-kind summary.
 *
 * Points hooked so far:
 *   buildApp:*                      bootstrap phases of a full Nest app
 *   globalSetup:TOTAL               shared-app boot in jest globalSetup
 *   prepareData:*                   fixture seeding layers
 *   prepareProject:*                project sub-seeding (branch, tables, row, endpoint)
 *   prepareBranch:*                 branch + system-table inserts
 *   prepareOrganizationUser:TOTAL   user + org-membership row
 *   http:gql / http:rest            per-request HTTP round-trip in expect-access
 *
 * The collector is a no-op when the env var is unset, so these hooks
 * cost ~nothing in normal runs.
 */

const FILE = path.join(os.tmpdir(), 'revisium-test-timings.jsonl');

interface TimingEvent {
  kind: string;
  ms: number;
  pid: number;
  wid: string;
}

let enabled = process.env.TEST_TIMINGS === '1';

export function enableTimings(): void {
  enabled = true;
}

export function resetTimingsFile(): void {
  try {
    fs.unlinkSync(FILE);
  } catch {
    // ignore
  }
}

export function recordTiming(kind: string, ms: number): void {
  if (!enabled) return;
  const evt: TimingEvent = {
    kind,
    ms,
    pid: process.pid,
    wid: process.env.JEST_WORKER_ID ?? '-',
  };
  fs.appendFileSync(FILE, JSON.stringify(evt) + '\n');
}

interface KindStats {
  kind: string;
  count: number;
  total: number;
  avg: number;
  p50: number;
  p95: number;
  max: number;
}

function summarize(): { totalEvents: number; perKind: KindStats[] } {
  let raw = '';
  try {
    raw = fs.readFileSync(FILE, 'utf8');
  } catch {
    return { totalEvents: 0, perKind: [] };
  }

  const events: TimingEvent[] = raw
    .split('\n')
    .filter(Boolean)
    .map((line) => JSON.parse(line) as TimingEvent);

  const byKind = new Map<string, number[]>();
  for (const e of events) {
    const bucket = byKind.get(e.kind) ?? [];
    bucket.push(e.ms);
    byKind.set(e.kind, bucket);
  }

  const perKind: KindStats[] = [];
  for (const [kind, samples] of byKind.entries()) {
    const sorted = [...samples].sort((a, b) => a - b);
    const total = sorted.reduce((a, b) => a + b, 0);
    const count = sorted.length;
    perKind.push({
      kind,
      count,
      total,
      avg: total / count,
      p50: sorted[Math.floor(count / 2)] ?? 0,
      p95: sorted[Math.floor(count * 0.95)] ?? 0,
      max: sorted[count - 1] ?? 0,
    });
  }
  perKind.sort((a, b) => b.total - a.total);

  return { totalEvents: events.length, perKind };
}

export function formatSummary(): string {
  const summary = summarize();
  const lines: string[] = [];
  lines.push('');
  lines.push('━'.repeat(90));
  lines.push(
    `  Test timings breakdown (${summary.totalEvents} events across all workers)`,
  );
  lines.push('━'.repeat(90));
  lines.push(
    '  ' +
      'kind'.padEnd(35) +
      'count'.padStart(7) +
      'total'.padStart(10) +
      'avg'.padStart(8) +
      'p50'.padStart(8) +
      'p95'.padStart(8) +
      'max'.padStart(8),
  );
  lines.push('  ' + '-'.repeat(84));
  for (const s of summary.perKind) {
    lines.push(
      '  ' +
        s.kind.padEnd(35) +
        String(s.count).padStart(7) +
        (Math.round(s.total) + 'ms').padStart(10) +
        (Math.round(s.avg) + 'ms').padStart(8) +
        (s.p50 + 'ms').padStart(8) +
        (s.p95 + 'ms').padStart(8) +
        (s.max + 'ms').padStart(8),
    );
  }
  lines.push('━'.repeat(90));
  return lines.join('\n');
}
