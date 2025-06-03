import { Row } from '@prisma/client';
import { RowModel } from 'src/api/rest-api/row/model';
import { IPaginatedType } from 'src/features/share/pagination.interface';

export const transformFromPrismaToRowModel = (data: Row): RowModel => {
  return {
    createdId: data.createdId,
    id: data.id,
    versionId: data.versionId,
    createdAt: data.createdAt,
    updatedAt: data.updatedAt,
    publishedAt: data.publishedAt,
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
