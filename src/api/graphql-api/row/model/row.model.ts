import { Field, Int, ObjectType } from '@nestjs/graphql';
import { Prisma } from 'src/__generated__/client';
import { JSONResolver, DateTimeResolver } from 'graphql-scalars';
import { RowsConnection } from 'src/api/graphql-api/row/model/rows-connection.model';

export type RowModelContext = {
  revisionId: string;
  tableId: string;
};

@ObjectType()
export class RowModel {
  @Field()
  createdId: string;

  @Field()
  id: string;

  @Field()
  versionId: string;

  @Field(() => DateTimeResolver)
  createdAt: Date;

  @Field(() => DateTimeResolver)
  updatedAt: Date;

  @Field(() => DateTimeResolver)
  publishedAt: Date;

  @Field(() => Boolean)
  readonly: boolean;

  @Field(() => JSONResolver)
  data: Prisma.JsonValue;

  @Field(() => RowsConnection)
  rowForeignKeysTo: RowsConnection;

  @Field(() => Int)
  countForeignKeysTo: number;

  @Field(() => RowsConnection)
  rowForeignKeysBy: RowsConnection;

  context: RowModelContext;
}
