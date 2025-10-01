import { Migration } from '@revisium/schema-toolkit/types';

export class GetMigrationsQuery {
  constructor(
    public readonly data: {
      readonly revisionId: string;
    },
  ) {}
}

export type GetMigrationsQueryData = GetMigrationsQuery['data'];

export type GetMigrationsQueryReturnType = Migration[];
