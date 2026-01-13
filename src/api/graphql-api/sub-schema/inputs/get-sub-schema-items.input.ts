import { Field, InputType, Int, registerEnumType } from '@nestjs/graphql';
import { JSONResolver } from 'graphql-scalars';
import { Prisma } from 'src/__generated__/client';

export enum NullsPosition {
  first = 'first',
  last = 'last',
}

registerEnumType(NullsPosition, { name: 'NullsPosition' });

@InputType()
export class SubSchemaStringFilterInput {
  @Field({ nullable: true })
  equals?: string;

  @Field({ nullable: true })
  not?: string;

  @Field({ nullable: true })
  contains?: string;

  @Field({ nullable: true })
  startsWith?: string;

  @Field({ nullable: true })
  endsWith?: string;

  @Field(() => [String], { nullable: true })
  in?: string[];

  @Field(() => [String], { nullable: true })
  notIn?: string[];

  @Field({ nullable: true })
  lt?: string;

  @Field({ nullable: true })
  lte?: string;

  @Field({ nullable: true })
  gt?: string;

  @Field({ nullable: true })
  gte?: string;

  @Field(() => Prisma.QueryMode, { nullable: true })
  mode?: Prisma.QueryMode;
}

@InputType()
export class SubSchemaJsonFilterInput {
  @Field(() => JSONResolver)
  path: string | string[];

  @Field(() => JSONResolver, { nullable: true })
  equals?: unknown;

  @Field(() => JSONResolver, { nullable: true })
  not?: unknown;

  @Field({ nullable: true })
  string_contains?: string;

  @Field({ nullable: true })
  string_starts_with?: string;

  @Field({ nullable: true })
  string_ends_with?: string;

  @Field(() => JSONResolver, { nullable: true })
  gt?: unknown;

  @Field(() => JSONResolver, { nullable: true })
  gte?: unknown;

  @Field(() => JSONResolver, { nullable: true })
  lt?: unknown;

  @Field(() => JSONResolver, { nullable: true })
  lte?: unknown;

  @Field(() => [JSONResolver], { nullable: true })
  in?: unknown[];

  @Field(() => [JSONResolver], { nullable: true })
  notIn?: unknown[];

  @Field(() => Prisma.QueryMode, { nullable: true })
  mode?: Prisma.QueryMode;
}

@InputType()
export class SubSchemaWhereInput {
  @Field(() => SubSchemaStringFilterInput, { nullable: true })
  tableId?: SubSchemaStringFilterInput | string;

  @Field(() => SubSchemaStringFilterInput, { nullable: true })
  rowId?: SubSchemaStringFilterInput | string;

  @Field(() => SubSchemaStringFilterInput, { nullable: true })
  fieldPath?: SubSchemaStringFilterInput | string;

  @Field(() => SubSchemaJsonFilterInput, { nullable: true })
  data?: SubSchemaJsonFilterInput;

  @Field(() => [SubSchemaWhereInput], { nullable: true })
  AND?: SubSchemaWhereInput[];

  @Field(() => [SubSchemaWhereInput], { nullable: true })
  OR?: SubSchemaWhereInput[];

  @Field(() => SubSchemaWhereInput, { nullable: true })
  NOT?: SubSchemaWhereInput;
}

@InputType()
export class SubSchemaDataOrderByInput {
  @Field(() => JSONResolver)
  path: string | string[];

  @Field(() => Prisma.SortOrder)
  order: Prisma.SortOrder;

  @Field(() => NullsPosition, { nullable: true })
  nulls?: NullsPosition;
}

@InputType()
export class SubSchemaOrderByItemInput {
  @Field(() => Prisma.SortOrder, { nullable: true })
  tableId?: Prisma.SortOrder;

  @Field(() => Prisma.SortOrder, { nullable: true })
  rowId?: Prisma.SortOrder;

  @Field(() => Prisma.SortOrder, { nullable: true })
  fieldPath?: Prisma.SortOrder;

  @Field(() => SubSchemaDataOrderByInput, { nullable: true })
  data?: SubSchemaDataOrderByInput;
}

@InputType()
export class GetSubSchemaItemsInput {
  @Field()
  revisionId: string;

  @Field()
  schemaId: string;

  @Field(() => Int)
  first: number;

  @Field({ nullable: true })
  after?: string;

  @Field(() => SubSchemaWhereInput, { nullable: true })
  where?: SubSchemaWhereInput;

  @Field(() => [SubSchemaOrderByItemInput], { nullable: true })
  orderBy?: SubSchemaOrderByItemInput[];
}
