import { TableMigrations } from 'src/features/share/utils/schema/types/migration';

export class GetMigrationsQuery {
  constructor(
    public readonly data: {
      readonly revisionId: string;
    },
  ) {}
}

export type GetMigrationsQueryData = GetMigrationsQuery['data'];

export type GetMigrationsQueryReturnType = TableMigrations[];
