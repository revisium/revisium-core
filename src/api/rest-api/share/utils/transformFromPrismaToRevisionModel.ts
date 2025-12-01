import { Revision } from 'src/__generated__/client';
import { RevisionModel } from 'src/api/rest-api/revision/model';
import { IPaginatedType } from 'src/features/share/pagination.interface';

export function transformFromPrismaToRevisionModel(
  data: Revision,
): RevisionModel;
export function transformFromPrismaToRevisionModel(
  data: Revision | null,
): RevisionModel | null;
export function transformFromPrismaToRevisionModel(
  data: Revision | null,
): RevisionModel | null {
  if (!data) {
    return null;
  }

  return {
    id: data.id,
    createdAt: data.createdAt,
    isDraft: data.isDraft,
    isHead: data.isHead,
  };
}

export const transformFromPaginatedPrismaToRevisionModel = ({
  pageInfo,
  totalCount,
  edges,
}: IPaginatedType<Revision>): IPaginatedType<RevisionModel> => {
  return {
    pageInfo,
    totalCount,
    edges: edges.map((edge) => ({
      cursor: edge.cursor,
      node: transformFromPrismaToRevisionModel(edge.node),
    })),
  };
};
