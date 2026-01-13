import { IQueryHandler, QueryHandler } from '@nestjs/cqrs';
import { Prisma, Table } from 'src/__generated__/client';
import { SubSchemaTableConfig, SubSchemaPath } from '@revisium/prisma-pg-json';
import { getValueByPath } from '@revisium/schema-toolkit/lib';
import { PrismaService } from 'src/infrastructure/database/prisma.service';
import { PluginService } from 'src/features/plugin/plugin.service';
import { ShareTransactionalQueries } from 'src/features/share/share.transactional.queries';
import {
  GetSubSchemaItemsQuery,
  GetSubSchemaItemsQueryReturnType,
  SubSchemaItemResult,
} from 'src/features/sub-schema/queries/impl';
import { getOffsetPagination } from 'src/features/share/commands/utils/getOffsetPagination';
import {
  getSubSchemaItemsSql,
  getSubSchemaItemsCountSql,
  convertRawSubSchemaItems,
  SubSchemaRawItem,
  ParsedSubSchemaItem,
} from 'src/features/sub-schema/utils/get-sub-schema-items-sql';
import { findRefPaths } from 'src/features/sub-schema/utils/find-ref-paths';

interface TableWithPaths {
  table: Table;
  paths: SubSchemaPath[];
}

const EMPTY_RESULT: GetSubSchemaItemsQueryReturnType = {
  totalCount: 0,
  pageInfo: {
    startCursor: undefined,
    endCursor: undefined,
    hasNextPage: false,
    hasPreviousPage: false,
  },
  edges: [],
};

@QueryHandler(GetSubSchemaItemsQuery)
export class GetSubSchemaItemsHandler
  implements
    IQueryHandler<GetSubSchemaItemsQuery, GetSubSchemaItemsQueryReturnType>
{
  constructor(
    private readonly prisma: PrismaService,
    private readonly shareTransactionalQueries: ShareTransactionalQueries,
    private readonly pluginService: PluginService,
  ) {}

  async execute({
    data,
  }: GetSubSchemaItemsQuery): Promise<GetSubSchemaItemsQueryReturnType> {
    const tablesConfig = await this.getTablesConfig(
      data.revisionId,
      data.schemaId,
    );

    if (tablesConfig.length === 0) {
      return EMPTY_RESULT;
    }

    return this.getPaginatedItems(data, tablesConfig);
  }

  private getPaginatedItems(
    data: GetSubSchemaItemsQuery['data'],
    tablesConfig: SubSchemaTableConfig[],
  ): Promise<GetSubSchemaItemsQueryReturnType> {
    return getOffsetPagination({
      pageData: data,
      findMany: (args) => this.findItems(data, tablesConfig, args),
      count: () => this.countItems(data, tablesConfig),
    });
  }

  private async findItems(
    data: GetSubSchemaItemsQuery['data'],
    tablesConfig: SubSchemaTableConfig[],
    args: { take: number; skip: number },
  ): Promise<SubSchemaItemResult[]> {
    const query = getSubSchemaItemsSql({
      tables: tablesConfig,
      where: data.where,
      orderBy: data.orderBy,
      take: args.take,
      skip: args.skip,
    });

    const rawItems = await this.prisma.$queryRaw<SubSchemaRawItem[]>(query);
    const parsedItems = convertRawSubSchemaItems(rawItems);

    return this.transformItems(parsedItems, data.revisionId);
  }

  private async countItems(
    data: GetSubSchemaItemsQuery['data'],
    tablesConfig: SubSchemaTableConfig[],
  ): Promise<number> {
    const query = getSubSchemaItemsCountSql({
      tables: tablesConfig,
      where: data.where,
    });

    const result = await this.prisma.$queryRaw<Array<{ count: bigint }>>(query);

    return Number(result[0].count);
  }

  private async transformItems(
    items: ParsedSubSchemaItem[],
    revisionId: string,
  ): Promise<SubSchemaItemResult[]> {
    if (items.length === 0) {
      return [];
    }

    await this.pluginService.computeRowsFromItems(
      revisionId,
      items.map((item) => ({ tableId: item.tableId, row: item.row })),
    );

    return items.map((item) => this.transformItem(item));
  }

  private transformItem(item: ParsedSubSchemaItem): SubSchemaItemResult {
    const data = getValueByPath(item.row.data, item.fieldPath);

    return {
      row: item.row,
      table: item.table,
      fieldPath: item.fieldPath,
      data: (data as Record<string, unknown>) ?? {},
    };
  }

  private async getTablesConfig(
    revisionId: string,
    schemaId: string,
  ): Promise<SubSchemaTableConfig[]> {
    const tablesWithPaths = await this.getTablesWithRefPaths(
      revisionId,
      schemaId,
    );

    return tablesWithPaths.map(({ table, paths }) => ({
      tableId: table.id,
      tableVersionId: table.versionId,
      paths,
    }));
  }

  private async getTablesWithRefPaths(
    revisionId: string,
    schemaId: string,
  ): Promise<TableWithPaths[]> {
    const tables = await this.getRevisionTables(revisionId);
    const result: TableWithPaths[] = [];

    for (const table of tables) {
      const paths = await this.findTableRefPaths(
        revisionId,
        table.id,
        schemaId,
      );

      if (paths.length > 0) {
        result.push({ table, paths });
      }
    }

    return result;
  }

  private getRevisionTables(revisionId: string): Promise<Table[]> {
    return this.prisma.revision
      .findUniqueOrThrow({ where: { id: revisionId } })
      .tables({
        where: { system: false },
        orderBy: { createdAt: Prisma.SortOrder.desc },
      });
  }

  private async findTableRefPaths(
    revisionId: string,
    tableId: string,
    schemaId: string,
  ): Promise<SubSchemaPath[]> {
    const { schema } = await this.shareTransactionalQueries.getTableSchema(
      revisionId,
      tableId,
    );

    return findRefPaths(schema, schemaId);
  }
}
