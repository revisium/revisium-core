import type { INestApplication } from '@nestjs/common';
import { deleteSharedAppInfo } from './shared-app-info';
import { formatSummary } from './timings';

export default async function globalTeardown(): Promise<void> {
  const app = (globalThis as Record<string, unknown>).__revisiumSharedApp as
    | INestApplication
    | undefined;
  if (app) {
    try {
      await app.close();
    } catch {
      // ignore
    }
  }
  deleteSharedAppInfo();

  if (process.env.TEST_TIMINGS === '1') {
    console.log(formatSummary());
  }
}
