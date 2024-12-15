import { Row } from '@prisma/client';
import { RowModel } from 'src/rest-api/row/model';
import { IPaginatedType } from 'src/share/pagination.interface';

export const transformFromPrismaToRowModel = (data: Row): RowModel => {
  return {
    versionId: data.versionId,
    id: data.id,
    createdAt: data.createdAt,
    readonly: data.readonly,
    data: data.data,
  };
};

export const transformFromPaginatedPrismaToRowModel = ({
  pageInfo,
  totalCount,
  edges,
}: IPaginatedType<Row>): IPaginatedType<RowModel> => {
  return {
    pageInfo,
    totalCount,
    edges: edges.map((edge) => ({
      cursor: edge.cursor,
      node: transformFromPrismaToRowModel(edge.node),
    })),
  };
};
