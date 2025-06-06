import { Field, InputType, Int } from '@nestjs/graphql';
import { Prisma } from '@prisma/client';

export enum OrderByField {
  createdAt = 'createdAt',
  id = 'id',
  updatedAt = 'updatedAt',
}

@InputType()
export class OrderBy {
  @Field(() => OrderByField)
  field: OrderByField;

  @Field(() => Prisma.SortOrder)
  direction: Prisma.SortOrder;
}

@InputType()
export class GetRowsInput {
  @Field()
  revisionId: string;

  @Field()
  tableId: string;

  @Field(() => Int)
  first: number;

  @Field({ nullable: true })
  after?: string;

  @Field(() => [OrderBy], { nullable: true })
  orderBy?: OrderBy[];
}
