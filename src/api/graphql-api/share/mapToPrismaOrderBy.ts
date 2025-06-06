import { Prisma } from '@prisma/client';
import { OrderBy } from 'src/api/graphql-api/row/inputs';

export const mapToPrismaOrderBy = (
  orderBy?: OrderBy[],
): Prisma.RowOrderByWithRelationInput[] | undefined => {
  if (!orderBy) return undefined;

  return orderBy.map((item) => ({
    [item.field]: item.direction,
  }));
};
