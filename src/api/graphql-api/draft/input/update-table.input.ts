import { Field, InputType } from '@nestjs/graphql';
import { JSONResolver } from 'graphql-scalars';
import { JsonPatch } from '@revisium/schema-toolkit/types';

@InputType()
export class UpdateTableInput {
  @Field()
  revisionId: string;

  @Field()
  tableId: string;

  @Field(() => JSONResolver)
  patches: JsonPatch[];
}
