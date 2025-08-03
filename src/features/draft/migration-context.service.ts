import { Injectable } from '@nestjs/common';
import { AsyncLocalStorage } from 'async_hooks';

type MigrationContextType = { migrationId?: string };

@Injectable()
export class MigrationContextService {
  private readonly asyncLocalStorage =
    new AsyncLocalStorage<MigrationContextType>();

  constructor() {}

  private get context() {
    return this.asyncLocalStorage.getStore();
  }

  public get migrationId() {
    return this.context?.migrationId;
  }

  public run<T, Func extends (...rest: unknown[]) => Promise<T>>(
    migrationId: string,
    handler: Func,
  ): Promise<T> {
    return this.asyncLocalStorage.run({ migrationId }, handler);
  }
}
