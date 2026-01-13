import { Field, ObjectType } from '@nestjs/graphql';
import { JSONResolver } from 'graphql-scalars';
import { Paginated } from 'src/api/graphql-api/share/model/paginated.model';
import { RowModel } from 'src/api/graphql-api/row/model/row.model';
import { TableModel } from 'src/api/graphql-api/table/model/table.model';

@ObjectType()
export class SubSchemaItemModel {
  @Field(() => RowModel)
  row: RowModel;

  @Field(() => TableModel)
  table: TableModel;

  @Field()
  fieldPath: string;

  @Field(() => JSONResolver)
  data: Record<string, unknown>;
}

@ObjectType()
export class SubSchemaItemsConnection extends Paginated(SubSchemaItemModel) {}
