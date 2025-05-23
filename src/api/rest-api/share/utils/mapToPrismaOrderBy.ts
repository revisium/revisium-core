import { Prisma } from '@prisma/client';
import { OrderByDto } from 'src/api/rest-api/share/model/order-by.model';

export const mapToPrismaOrderBy = (
  orderBy?: OrderByDto[],
): Prisma.RowOrderByWithRelationInput[] | undefined => {
  if (!orderBy) return undefined;

  return orderBy.map((item) => ({
    [item.field]: item.direction,
  }));
};
