import { Table } from '@prisma/client';
import { TableModel } from 'src/rest-api/table/model/table.model';
import { IPaginatedType } from 'src/share/pagination.interface';

export const transformFromPrismaToTableModel = (data: Table): TableModel => {
  return {
    versionId: data.versionId,
    id: data.id,
    createdAt: data.createdAt,
    readonly: data.readonly,
  };
};

export const transformFromPaginatedPrismaToTableModel = ({
  pageInfo,
  totalCount,
  edges,
}: IPaginatedType<Table>): IPaginatedType<TableModel> => {
  return {
    pageInfo,
    totalCount,
    edges: edges.map((edge) => ({
      cursor: edge.cursor,
      node: transformFromPrismaToTableModel(edge.node),
    })),
  };
};
