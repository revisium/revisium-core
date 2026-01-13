import { BadRequestException, Injectable } from '@nestjs/common';
import { Prisma, Row } from 'src/__generated__/client';
import { PluginListService } from 'src/features/plugin/plugin.list.service';
import {
  ComputeRowsOptions,
  AfterCreateRowOptions,
  InternalComputeRowsOptions,
  InternalAfterCreateRowOptions,
  InternalAfterUpdateRowOptions,
  AfterMigrateRowsOptions,
  AfterUpdateRowOptions,
  RowWithTableId,
} from 'src/features/plugin/types';
import { JsonSchemaStoreService } from 'src/features/share/json-schema-store.service';
import { JsonSchemaValidatorService } from 'src/features/share/json-schema-validator.service';
import { ShareTransactionalQueries } from 'src/features/share/share.transactional.queries';
import { systemTablesIds } from 'src/features/share/system-tables.consts';
import { createJsonValueStore } from '@revisium/schema-toolkit/lib';
import { JsonValue, JsonSchema } from '@revisium/schema-toolkit/types';
import { PrismaService } from 'src/infrastructure/database/prisma.service';
import { TransactionPrismaService } from 'src/infrastructure/database/transaction-prisma.service';

@Injectable()
export class PluginService {
  constructor(
    private readonly shareTransactionalQueries: ShareTransactionalQueries,
    private readonly transactionPrisma: TransactionPrismaService,
    private readonly prismaService: PrismaService,
    private readonly jsonSchemaStore: JsonSchemaStoreService,
    private readonly jsonSchemaValidator: JsonSchemaValidatorService,
    private readonly pluginsListService: PluginListService,
  ) {}

  public async afterCreateRow(
    options: AfterCreateRowOptions,
  ): Promise<Prisma.InputJsonValue> {
    const { schema, schemaHash, schemaStore } =
      await this.prepareSchemaContext(options);

    const valueStore = createJsonValueStore(
      schemaStore,
      options.rowId,
      options.data as JsonValue,
    );

    const internalOptions: InternalAfterCreateRowOptions = {
      ...options,
      schemaStore,
      valueStore,
    };

    for (const plugin of this.pluginsListService.orderedPlugins) {
      await plugin.afterCreateRow(internalOptions);
    }

    const data = valueStore.getPlainValue();

    await this.validateData({
      data,
      schema,
      schemaHash,
    });

    return data;
  }

  public async afterUpdateRow(
    options: AfterUpdateRowOptions,
  ): Promise<Prisma.InputJsonValue> {
    const { schema, schemaHash, schemaStore } =
      await this.prepareSchemaContext(options);

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

    const internalOptions: InternalAfterUpdateRowOptions = {
      ...options,
      schemaStore,
      valueStore,
      previousValueStore,
    };

    for (const plugin of this.pluginsListService.orderedPlugins) {
      await plugin.afterUpdateRow(internalOptions);
    }

    const data = valueStore.getPlainValue();

    await this.validateData({
      data,
      schema,
      schemaHash,
    });

    return data;
  }

  public async computeRows(options: ComputeRowsOptions): Promise<void> {
    if (systemTablesIds.includes(options.tableId)) {
      return;
    }

    const { schemaStore } = await this.prepareSchemaContext(options);

    const internalOptions: InternalComputeRowsOptions = {
      ...options,
      schemaStore,
    };

    for (const plugin of this.pluginsListService.orderedPlugins) {
      await plugin.computeRows(internalOptions);
    }
  }

  public async computeRowsFromItems(
    revisionId: string,
    items: RowWithTableId[],
  ): Promise<void> {
    const rowsByTable = this.groupRowsByTable(items);

    await Promise.all(
      Array.from(rowsByTable.entries()).map(([tableId, rows]) =>
        this.computeRows({ revisionId, tableId, rows }),
      ),
    );
  }

  public groupRowsByTable(items: RowWithTableId[]): Map<string, Row[]> {
    const rowsByTable = new Map<string, Row[]>();

    for (const item of items) {
      const rows = rowsByTable.get(item.tableId) ?? [];

      if (!rows.some((r) => r.versionId === item.row.versionId)) {
        rows.push(item.row);
      }

      rowsByTable.set(item.tableId, rows);
    }

    return rowsByTable;
  }

  public async afterMigrateRows(
    options: AfterMigrateRowsOptions,
  ): Promise<void> {
    const { schemaStore } = await this.prepareSchemaContext(options);

    const internalOptions: InternalComputeRowsOptions = {
      ...options,
      schemaStore,
    };

    for (const plugin of this.pluginsListService.orderedPlugins) {
      await plugin.afterMigrateRows(internalOptions);
    }
  }

  public async prepareSchemaContext(options: {
    revisionId: string;
    tableId: string;
  }) {
    const { schema, hash: schemaHash } =
      await this.shareTransactionalQueries.getTableSchema(
        options.revisionId,
        options.tableId,
      );

    const schemaStore = this.jsonSchemaStore.create(schema);

    return {
      schema,
      schemaHash,
      schemaStore,
    };
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
    const row = await this.prisma.row.findFirst({
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

    if (!row) {
      throw new BadRequestException(
        'A row with this name does not exist in the revision',
      );
    }

    return row;
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
    return this.transactionPrisma.getTransactionUnsafe() ?? this.prismaService;
  }
}
