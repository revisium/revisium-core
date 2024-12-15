import { Field, Int, ObjectType } from '@nestjs/graphql';
import { Prisma } from '@prisma/client';
import GraphQLJSON from 'graphql-type-json';

import { RowsConnection } from 'src/graphql-api/row/model/rows-connection.model';
import { TablesConnection } from 'src/graphql-api/table/model/table-connection.model';

export type TableModelContext = {
  revisionId: string;
};

@ObjectType()
export class TableModel {
  @Field()
  versionId: string;

  @Field(() => Date)
  createdAt: Date;

  @Field(() => Boolean)
  readonly: boolean;

  @Field()
  id: string;

  @Field(() => RowsConnection)
  rows: RowsConnection;

  @Field(() => Int)
  count: number;

  @Field(() => GraphQLJSON)
  schema: Prisma.JsonValue;

  @Field(() => TablesConnection)
  referencesTo: TablesConnection;

  @Field(() => Int)
  countReferencesTo: number;

  @Field(() => TablesConnection)
  referencesBy: TablesConnection;

  @Field(() => Int)
  countReferencesBy: number;

  context: TableModelContext;
}
