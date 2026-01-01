import { Injectable } from '@nestjs/common';
import { CommandBus } from '@nestjs/cqrs';
import { Prisma } from 'src/__generated__/client';
import { ResolveDraftRevisionCommand } from 'src/features/draft/commands/impl/transactional/resolve-draft-revision.command';
import {
  ValidateDataCommand,
  ValidateDataCommandReturnType,
} from 'src/features/draft/commands/impl/transactional/validate-data.command';
import { ValidateNotSystemTableCommand } from 'src/features/draft/commands/impl/transactional/validate-not-system-table.command';
import { ValidateSchemaCommand } from 'src/features/draft/commands/impl/transactional/validate-schema.command';
import { JsonSchema } from '@revisium/schema-toolkit/types';

@Injectable()
export class DraftTransactionalCommands {
  constructor(private readonly commandBus: CommandBus) {}

  public async resolveDraftRevision(revisionId: string) {
    return this.commandBus.execute<ResolveDraftRevisionCommand>(
      new ResolveDraftRevisionCommand(revisionId),
    );
  }

  public async validateNotSystemTable(tableId: string) {
    return this.commandBus.execute<ValidateNotSystemTableCommand>(
      new ValidateNotSystemTableCommand(tableId),
    );
  }

  public async validateData(data: {
    readonly revisionId: string;
    readonly tableId: string;
    readonly tableSchema?: JsonSchema;
    readonly rows: { rowId: string; data: Prisma.InputJsonValue }[];
  }) {
    return this.commandBus.execute<
      ValidateDataCommand,
      ValidateDataCommandReturnType
    >(new ValidateDataCommand(data));
  }

  public async validateSchema(schema: Prisma.InputJsonValue) {
    return this.commandBus.execute<ValidateSchemaCommand>(
      new ValidateSchemaCommand(schema),
    );
  }
}
