import { Field, Int, ObjectType } from '@nestjs/graphql';
import { Prisma } from '@prisma/client';
import GraphQLJSON from 'graphql-type-json';
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

  @Field(() => Date)
  createdAt: Date;

  @Field(() => Date)
  updatedAt: Date;

  @Field(() => Boolean)
  readonly: boolean;

  @Field(() => GraphQLJSON)
  data: Prisma.JsonValue;

  @Field(() => RowsConnection)
  rowForeignKeysTo: RowsConnection;

  @Field(() => Int)
  countForeignKeysTo: number;

  @Field(() => RowsConnection)
  rowForeignKeysBy: RowsConnection;

  context: RowModelContext;
}
