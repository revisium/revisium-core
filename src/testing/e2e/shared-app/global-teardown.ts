import type { INestApplication } from '@nestjs/common';
import { deleteSharedAppInfo, releaseRunLock } from './shared-app-info';

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
  releaseRunLock();
}
