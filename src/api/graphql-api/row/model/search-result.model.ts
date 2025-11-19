import { Field, ObjectType } from '@nestjs/graphql';
import { JSONResolver } from 'graphql-scalars';
import { RowModel } from 'src/api/graphql-api/row/model/row.model';
import { TableModel } from 'src/api/graphql-api/table/model/table.model';

@ObjectType()
export class SearchMatch {
  @Field()
  path: string;

  @Field(() => JSONResolver)
  value: any;

  @Field(() => String, { nullable: true })
  highlight?: string;
}

@ObjectType()
export class SearchResult {
  @Field(() => RowModel)
  row: RowModel;

  @Field(() => TableModel)
  table: TableModel;

  @Field(() => [SearchMatch])
  matches: SearchMatch[];
}
