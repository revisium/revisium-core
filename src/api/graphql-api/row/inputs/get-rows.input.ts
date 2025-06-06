import { Field, InputType, Int } from '@nestjs/graphql';
import { Prisma } from '@prisma/client';
import GraphQLJSON from 'graphql-type-json';

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
export class BooleanFilter {
  @Field(() => Boolean, { nullable: true })
  equals?: boolean;

  @Field(() => Boolean, { nullable: true })
  not?: boolean;
}

@InputType()
export class DateTimeFilter {
  @Field({ nullable: true })
  equals?: string;

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
}

@InputType()
export class StringFilter {
  @Field({ nullable: true })
  contains?: string;

  @Field({ nullable: true })
  startsWith?: string;

  @Field({ nullable: true })
  endsWith?: string;

  @Field({ nullable: true })
  gt?: string;

  @Field({ nullable: true })
  gte?: string;

  @Field({ nullable: true })
  lt?: string;

  @Field({ nullable: true })
  lte?: string;

  @Field({ nullable: true })
  not?: string;

  @Field(() => Prisma.QueryMode, { nullable: true })
  mode?: Prisma.QueryMode;

  @Field(() => [String], { nullable: true })
  notIn?: string[];
}

@InputType()
export class JsonFilter {
  @Field(() => [String], { nullable: true })
  path?: string[];

  @Field(() => Prisma.QueryMode, { nullable: true })
  mode?: Prisma.QueryMode;

  @Field(() => GraphQLJSON, { nullable: true })
  equals?: Prisma.InputJsonValue;

  @Field({ nullable: true })
  string_contains?: string;

  @Field({ nullable: true })
  string_starts_with?: string;

  @Field({ nullable: true })
  string_ends_with?: string;

  @Field(() => [GraphQLJSON], { nullable: true })
  array_contains?: Prisma.InputJsonValue[];

  @Field(() => GraphQLJSON, { nullable: true })
  array_starts_with?: Prisma.InputJsonValue;

  @Field(() => GraphQLJSON, { nullable: true })
  array_ends_with?: Prisma.InputJsonValue;

  @Field(() => Number, { nullable: true })
  lt?: number;

  @Field(() => Number, { nullable: true })
  lte?: number;

  @Field(() => Number, { nullable: true })
  gt?: number;

  @Field(() => Number, { nullable: true })
  gte?: number;
}

@InputType()
export class WhereInput {
  @Field(() => [WhereInput], { nullable: true })
  AND: WhereInput[];

  @Field(() => [WhereInput], { nullable: true })
  NOT: WhereInput[];

  @Field(() => [WhereInput], { nullable: true })
  OR: WhereInput[];

  @Field(() => StringFilter, { nullable: true })
  id?: StringFilter;

  @Field(() => StringFilter, { nullable: true })
  createdId?: StringFilter;

  @Field(() => StringFilter, { nullable: true })
  versionId?: StringFilter;

  @Field(() => BooleanFilter, { nullable: true })
  readonly?: BooleanFilter;

  @Field(() => DateTimeFilter, { nullable: true })
  createdAt?: DateTimeFilter;

  @Field(() => DateTimeFilter, { nullable: true })
  updatedAt?: DateTimeFilter;

  @Field(() => DateTimeFilter, { nullable: true })
  publishedAt?: DateTimeFilter;

  @Field(() => JsonFilter, { nullable: true })
  data?: JsonFilter;
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

  @Field(() => WhereInput, { nullable: true })
  where?: WhereInput;
}
