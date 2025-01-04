import { Field, InputType } from '@nestjs/graphql';
import GraphQLJSON from 'graphql-type-json';
import { Prisma } from '@prisma/client';
import { GetRowInput } from 'src/api/graphql-api/row/inputs/get-row.input';

@InputType()
export class UpdateRowInput extends GetRowInput {
  @Field(() => GraphQLJSON)
  data: Prisma.InputJsonValue;
}
