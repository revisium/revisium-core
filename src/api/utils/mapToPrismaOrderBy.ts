import { GetRowsQueryData, JsonOrder } from 'src/features/row/queries/impl';

interface OrderBy {
  field: 'createdAt' | 'updatedAt' | 'publishedAt' | 'id' | 'data';
  direction: 'asc' | 'desc';
  path?: string;
  type?: 'text' | 'int' | 'float' | 'boolean' | 'timestamp';
  aggregation?: 'min' | 'max' | 'avg' | 'first' | 'last';
}

export const mapToPrismaOrderBy = (
  orderBy?: OrderBy[],
): GetRowsQueryData['orderBy'] => {
  if (!orderBy) return undefined;

  return orderBy.map((item) => {
    if (item.field === 'data') {
      return {
        data: {
          path: item.path,
          aggregation: item.aggregation,
          direction: item.direction,
          type: item.type,
        },
      } as JsonOrder;
    }

    return {
      [item.field]: item.direction,
    };
  });
};
