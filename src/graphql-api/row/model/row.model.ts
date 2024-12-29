import { Field, Int, ObjectType } from '@nestjs/graphql';
import { Prisma } from '@prisma/client';
import GraphQLJSON from 'graphql-type-json';
import { RowsConnection } from 'src/graphql-api/row/model/rows-connection.model';

export type RowModelContext = {
  revisionId: string;
  tableId: string;
};

@ObjectType()
export class RowModel {
  @Field()
  versionId: string;

  @Field(() => Date)
  createdAt: Date;

  @Field(() => Boolean)
  readonly: boolean;

  @Field()
  id: string;

  @Field(() => GraphQLJSON)
  data: Prisma.JsonValue;

  @Field(() => RowsConnection)
  rowReferencesTo: RowsConnection;

  @Field(() => Int)
  countReferencesTo: number;

  @Field(() => RowsConnection)
  rowReferencesBy: RowsConnection;

  context: RowModelContext;
}