import { IPaginatedType } from 'src/features/share/pagination.interface';

export function getEmptyPaginatedResponse<T>(): IPaginatedType<T> {
  return {
    totalCount: 0,
    edges: [],
    pageInfo: {
      hasPreviousPage: false,
      hasNextPage: false,
    },
  };
}
