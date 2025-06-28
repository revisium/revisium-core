import { Field, ObjectType } from '@nestjs/graphql';
import { Prisma } from '@prisma/client';
import GraphQLJSON from 'graphql-type-json';

@ObjectType()
export class RowSuggestionResultModel {
  @Field(() => GraphQLJSON)
  data: Prisma.JsonValue;

  @Field(() => [GraphQLJSON])
  patches: [Prisma.JsonValue];
}
