import { Field, Int, ObjectType } from '@nestjs/graphql';
import { Prisma } from 'src/__generated__/client';
import { DateTimeResolver, JSONResolver } from 'graphql-scalars';

import { RowsConnection } from 'src/api/graphql-api/row/model/rows-connection.model';
import { TablesConnection } from 'src/api/graphql-api/table/model/table-connection.model';
import { Relation } from 'src/api/graphql-api/share/model/relation.type';
import { TableViewsDataModel } from 'src/api/graphql-api/views/model/table-views-data.model';

export type TableModelContext = {
  revisionId: string;
};

@ObjectType()
export class TableModel {
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

  @Field(() => Boolean)
  readonly: boolean;

  @Field(() => RowsConnection)
  rows: RowsConnection;

  @Field(() => Int)
  count: number;

  @Field(() => JSONResolver)
  schema: Prisma.JsonValue;

  @Field(() => TablesConnection)
  foreignKeysTo: Relation<TablesConnection>;

  @Field(() => Int)
  countForeignKeysTo: number;

  @Field(() => TablesConnection)
  foreignKeysBy: Relation<TablesConnection>;

  @Field(() => Int)
  countForeignKeysBy: number;

  @Field(() => TableViewsDataModel)
  views: TableViewsDataModel;

  context: TableModelContext;
}
