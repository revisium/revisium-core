import { Field, InputType } from '@nestjs/graphql';
import { Prisma } from '@prisma/client';
import GraphQLJSON from 'graphql-type-json';
import { GetRowInput } from 'src/api/graphql-api/row/inputs/get-row.input';

@InputType()
export class GetRowSuggestionInput extends GetRowInput {
  @Field()
  revisionId: string;

  @Field()
  tableId: string;

  @Field()
  rowId: string;

  @Field(() => GraphQLJSON)
  data: Prisma.InputJsonValue;

  @Field()
  prompt: string;
}
