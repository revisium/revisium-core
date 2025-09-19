import { Field, InputType } from '@nestjs/graphql';
import { JSONResolver } from 'graphql-scalars';
import { JsonPatch } from 'src/features/share/utils/schema/types/json-patch.types';

@InputType()
export class UpdateTableInput {
  @Field()
  revisionId: string;

  @Field()
  tableId: string;

  @Field(() => JSONResolver)
  patches: JsonPatch[];
}
