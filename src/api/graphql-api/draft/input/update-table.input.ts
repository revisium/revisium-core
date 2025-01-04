import { Field, InputType } from '@nestjs/graphql';
import GraphQLJSON from 'graphql-type-json';
import { JsonPatch } from 'src/features/share/utils/schema/types/json-patch.types';

@InputType()
export class UpdateTableInput {
  @Field()
  revisionId: string;

  @Field()
  tableId: string;

  @Field(() => GraphQLJSON)
  patches: JsonPatch[];
}
