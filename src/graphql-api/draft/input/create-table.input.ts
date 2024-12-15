import { Field, InputType } from '@nestjs/graphql';
import { Prisma } from '@prisma/client';
import GraphQLJSON from 'graphql-type-json';

@InputType()
export class CreateTableInput {
  @Field()
  revisionId: string;

  @Field()
  tableId: string;

  @Field(() => GraphQLJSON)
  schema: Prisma.InputJsonValue;
}
