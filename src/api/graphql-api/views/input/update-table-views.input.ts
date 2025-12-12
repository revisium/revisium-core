import { Field, Float, InputType, Int } from '@nestjs/graphql';
import { JSONResolver } from 'graphql-scalars';
import { Prisma } from 'src/__generated__/client';

@InputType()
export class ViewColumnInput {
  @Field()
  field: string;

  @Field(() => Float, { nullable: true })
  width?: number;
}

@InputType()
export class ViewSortInput {
  @Field()
  field: string;

  @Field(() => Prisma.SortOrder)
  direction: Prisma.SortOrder;
}

@InputType()
export class ViewInput {
  @Field()
  id: string;

  @Field()
  name: string;

  @Field({ nullable: true })
  description?: string;

  @Field(() => [ViewColumnInput], { nullable: true })
  columns?: ViewColumnInput[];

  @Field(() => JSONResolver, { nullable: true })
  filters?: Record<string, unknown>;

  @Field(() => [ViewSortInput], { nullable: true })
  sorts?: ViewSortInput[];

  @Field({ nullable: true })
  search?: string;
}

@InputType()
export class TableViewsDataInput {
  @Field(() => Int)
  version: number;

  @Field()
  defaultViewId: string;

  @Field(() => [ViewInput])
  views: ViewInput[];
}

@InputType()
export class UpdateTableViewsInput {
  @Field()
  revisionId: string;

  @Field()
  tableId: string;

  @Field(() => TableViewsDataInput)
  viewsData: TableViewsDataInput;
}
