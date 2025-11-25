import { GetRevisionChangesQueryReturnType } from '../queries/impl/get-revision-changes.query';
import { IPaginatedType } from 'src/features/share/pagination.interface';

export function createEmptyRevisionChangesResponse(
  revisionId: string,
): GetRevisionChangesQueryReturnType {
  return {
    revisionId,
    parentRevisionId: null,
    totalChanges: 0,
    tablesSummary: {
      total: 0,
      added: 0,
      modified: 0,
      removed: 0,
      renamed: 0,
    },
    rowsSummary: {
      total: 0,
      added: 0,
      modified: 0,
      removed: 0,
      renamed: 0,
    },
  };
}

export function createEmptyPaginatedResponse<T>(): IPaginatedType<T> {
  return {
    edges: [],
    totalCount: 0,
    pageInfo: {
      hasNextPage: false,
      hasPreviousPage: false,
    },
  };
}
