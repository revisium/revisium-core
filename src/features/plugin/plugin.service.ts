import { BadRequestException, Injectable } from '@nestjs/common';
import { Prisma } from '@prisma/client';
import { JsonSchemaValidatorService } from 'src/features/share/json-schema-validator.service';
import { PluginListService } from 'src/features/plugin/plugin.list.service';
import {
  CreateRowOptions,
  InternalCreateRowOptions,
  InternalUpdateRowOptions,
  UpdateRowOptions,
} from 'src/features/plugin/types';
import { JsonSchemaStoreService } from 'src/features/share/json-schema-store.service';
import { ShareTransactionalQueries } from 'src/features/share/share.transactional.queries';
import { createJsonValueStore } from 'src/features/share/utils/schema/lib/createJsonValueStore';
import { JsonValue } from 'src/features/share/utils/schema/types/json.types';
import { JsonSchema } from 'src/features/share/utils/schema/types/schema.types';
import { TransactionPrismaService } from 'src/infrastructure/database/transaction-prisma.service';

@Injectable()
export class PluginService {
  constructor(
    private readonly shareTransactionalQueries: ShareTransactionalQueries,
    private readonly transactionPrisma: TransactionPrismaService,
    private readonly jsonSchemaStore: JsonSchemaStoreService,
    private readonly jsonSchemaValidator: JsonSchemaValidatorService,
    private readonly pluginsListService: PluginListService,
  ) {}

  public async createRow(
    options: CreateRowOptions,
  ): Promise<Prisma.InputJsonValue> {
    const { schema, hash: schemaHash } =
      await this.shareTransactionalQueries.getTableSchema(
        options.revisionId,
        options.tableId,
      );

    const schemaStore = this.jsonSchemaStore.create(schema);
    const valueStore = createJsonValueStore(
      schemaStore,
      options.rowId,
      options.data as JsonValue,
    );

    const internalOptions: InternalCreateRowOptions = {
      ...options,
      schemaStore,
      valueStore,
    };

    for (const plugin of this.pluginsListService.orderedPlugins) {
      await plugin.createRow(internalOptions);
    }

    const data = valueStore.getPlainValue();

    await this.validateData({
      data,
      schema,
      schemaHash,
    });

    return data;
  }

  public async updateRow(
    options: UpdateRowOptions,
  ): Promise<Prisma.InputJsonValue> {
    const { schema, hash: schemaHash } =
      await this.shareTransactionalQueries.getTableSchema(
        options.revisionId,
        options.tableId,
      );

    const schemaStore = this.jsonSchemaStore.create(schema);
    const valueStore = createJsonValueStore(
      schemaStore,
      options.rowId,
      options.data as JsonValue,
    );

    const row = await this.getRow(options);
    const previousValueStore = createJsonValueStore(
      schemaStore,
      options.rowId,
      row.data,
    );

    const internalOptions: InternalUpdateRowOptions = {
      ...options,
      schemaStore,
      valueStore,
      previousValueStore,
    };

    for (const plugin of this.pluginsListService.orderedPlugins) {
      await plugin.updateRow(internalOptions);
    }

    const data = valueStore.getPlainValue();

    await this.validateData({
      data,
      schema,
      schemaHash,
    });

    return data;
  }

  private async getRow({
    revisionId,
    tableId,
    rowId,
  }: {
    revisionId: string;
    tableId: string;
    rowId: string;
  }) {
    return this.prisma.row.findFirstOrThrow({
      where: {
        id: rowId,
        tables: {
          some: {
            id: tableId,
            revisions: {
              some: {
                id: revisionId,
              },
            },
          },
        },
      },
    });
  }

  private async validateData({
    data,
    schema,
    schemaHash,
  }: {
    schema: JsonSchema;
    schemaHash: string;
    data: unknown;
  }): Promise<void> {
    const { result, errors } = await this.jsonSchemaValidator.validate(
      data,
      schema,
      schemaHash,
    );

    if (!result) {
      throw new BadRequestException('data is not valid', {
        cause: errors,
      });
    }
  }

  private get prisma() {
    return this.transactionPrisma.getTransaction();
  }
}
