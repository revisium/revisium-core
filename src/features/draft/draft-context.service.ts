import { Injectable, InternalServerErrorException } from '@nestjs/common';
import { AsyncLocalStorage } from 'async_hooks';

export enum DraftContextKeys {
  OrganizationId = 'organizationId',
  ProjectId = 'projectId',
  BranchId = 'branchId',
  DraftRevisionId = 'draftRevisionId',
  DraftParentRevisionId = 'draftParentRevisionId',

  DraftTableId = 'draftTableId',
  DraftTableVersionId = 'draftTableVersionId',
  DraftTableCreatedId = 'draftTableCreatedId',
  DraftTablePreviousVersionId = 'draftTablePreviousVersionId',

  DraftRowId = 'draftRowId',
  DraftRowVersionId = 'draftRowVersionId',
  DraftRowCreatedId = 'draftRowCreatedId',
  DraftRowPreviousVersionId = 'draftRowPreviousVersionId',

  DraftRows = 'draftRows',
}

const SHARED_KEYS: DraftContextKeys[] = [
  DraftContextKeys.BranchId,
  DraftContextKeys.DraftRevisionId,
];

type DraftContextType = Partial<Record<DraftContextKeys, unknown>>;

@Injectable()
export class DraftContextService {
  private readonly asyncLocalStorage =
    new AsyncLocalStorage<DraftContextType>();

  constructor() {}

  public get context() {
    const store = this.asyncLocalStorage.getStore();

    if (!store) {
      throw new InternalServerErrorException(
        'Context not found. It appears that an attempt was made to access the context outside of DraftContextService.run.',
      );
    }

    return store;
  }

  public get notSafeContext() {
    return this.asyncLocalStorage.getStore();
  }

  public run<T, Func extends (...rest: unknown[]) => Promise<T>>(
    handler: Func,
  ): Promise<T> {
    return this.asyncLocalStorage.run({}, handler);
  }

  public mergeParentContext(parentContext: DraftContextType | undefined) {
    for (const sharedKey of SHARED_KEYS) {
      if (parentContext?.[sharedKey]) {
        this.setKey(sharedKey, parentContext[sharedKey]);
      }
    }
  }

  public resolveKey<T>(key: DraftContextKeys): T {
    if (!this.context[key]) {
      throw new InternalServerErrorException(`${key} not found.`);
    }

    return this.context[key] as T;
  }

  public hasKey(key: DraftContextKeys): boolean {
    return Boolean(this.context[key]);
  }

  public setKey(key: DraftContextKeys, value: unknown) {
    this.context[key] = value;
  }
}
