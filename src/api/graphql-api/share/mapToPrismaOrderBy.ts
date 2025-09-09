import { Prisma } from '@prisma/client';
import { OrderBy } from 'src/api/graphql-api/row/inputs';
import { JsonOrder } from 'src/features/row/queries/impl';

export const mapToPrismaOrderBy = (
  orderBy?: OrderBy[],
): (Prisma.RowOrderByWithRelationInput | JsonOrder)[] | undefined => {
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
