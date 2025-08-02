import { CreateInitMigrationHandler } from 'src/features/draft/commands/handlers/migration/create-init-migration.handler';
import { CreateRenameMigrationHandler } from 'src/features/draft/commands/handlers/migration/create-rename-migration.handler';
import { CreateUpdateMigrationHandler } from 'src/features/draft/commands/handlers/migration/create-update-migration.handler';

export const MIGRATION_COMMANDS = [
  CreateInitMigrationHandler,
  CreateUpdateMigrationHandler,
  CreateRenameMigrationHandler,
];
