import { Table } from 'src/__generated__/client';
import { TableModel } from 'src/api/rest-api/table/model/table.model';
import { IPaginatedType } from 'src/features/share/pagination.interface';

export const transformFromPrismaToTableModel = (data: Table): TableModel => {
  return {
    createdId: data.createdId,
    id: data.id,
    versionId: data.versionId,
    createdAt: data.createdAt,
    updatedAt: data.updatedAt,
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
