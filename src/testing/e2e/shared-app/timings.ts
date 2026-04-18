import * as fs from 'node:fs';
import * as os from 'node:os';
import * as path from 'node:path';

const FILE = path.join(os.tmpdir(), 'revisium-test-timings.jsonl');

export const TIMINGS_FILE = FILE;

export interface TimingEvent {
  kind: string;
  ms: number;
  pid?: number;
  wid?: string;
  file?: string;
}

let enabled = process.env.TEST_TIMINGS === '1';

export function enableTimings(): void {
  enabled = true;
}

export function isTimingsEnabled(): boolean {
  return enabled;
}

export function resetTimingsFile(): void {
  try {
    fs.unlinkSync(FILE);
  } catch {
    // ignore
  }
}

export function recordTiming(kind: string, ms: number, file?: string): void {
  if (!enabled) return;
  const evt: TimingEvent = {
    kind,
    ms,
    pid: process.pid,
    wid: process.env.JEST_WORKER_ID ?? '-',
    file,
  };
  fs.appendFileSync(FILE, JSON.stringify(evt) + '\n');
}

export async function time<T>(kind: string, fn: () => Promise<T>): Promise<T> {
  if (!enabled) return fn();
  const t0 = Date.now();
  try {
    return await fn();
  } finally {
    recordTiming(kind, Date.now() - t0);
  }
}

export interface KindStats {
  kind: string;
  count: number;
  total: number;
  avg: number;
  p50: number;
  p95: number;
  max: number;
}

export function summarize(): {
  wallClockRange: number;
  totalEvents: number;
  perKind: KindStats[];
} {
  let raw = '';
  try {
    raw = fs.readFileSync(FILE, 'utf8');
  } catch {
    return { wallClockRange: 0, totalEvents: 0, perKind: [] };
  }

  const events: TimingEvent[] = raw
    .split('\n')
    .filter(Boolean)
    .map((line) => JSON.parse(line) as TimingEvent);

  const byKind = new Map<string, number[]>();
  for (const e of events) {
    if (!byKind.has(e.kind)) byKind.set(e.kind, []);
    byKind.get(e.kind)!.push(e.ms);
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
      p50: sorted[Math.floor(count / 2)] || 0,
      p95: sorted[Math.floor(count * 0.95)] || 0,
      max: sorted[count - 1] || 0,
    });
  }
  perKind.sort((a, b) => b.total - a.total);

  return {
    wallClockRange: 0,
    totalEvents: events.length,
    perKind,
  };
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
