import { OrderByDto } from 'src/api/rest-api/share/model/order-by.model';
import { GetRowsQueryData, JsonOrder } from 'src/features/row/queries/impl';

export const mapToPrismaOrderBy = (
  orderBy?: OrderByDto[],
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
