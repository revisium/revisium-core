import { Migration } from 'src/features/share/utils/schema/types/migration';

export class ApplyMigrationsCommand {
  constructor(
    public readonly data: {
      readonly revisionId: string;
      readonly migrations: Migration[];
    },
  ) {}
}

export type ApplyMigrationCommandData = ApplyMigrationsCommand['data'];

export type ApplyMigrationResult = {
  id: string;
  status: 'applied' | 'failed' | 'skipped';
  error?: string;
};

export type ApplyMigrationCommandReturnType = ApplyMigrationResult[];
