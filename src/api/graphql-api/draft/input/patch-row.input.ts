import { Field, InputType } from '@nestjs/graphql';
import GraphQLJSON from 'graphql-type-json';
import { GetRowInput } from 'src/api/graphql-api/row/inputs/get-row.input';
import { JsonValue } from 'src/features/share/utils/schema/types/json.types';

export enum PatchRowOp {
  replace = 'replace',
}

@InputType()
export class PatchRow {
  @Field(() => PatchRowOp)
  op: 'replace';

  @Field()
  path: string;

  @Field(() => GraphQLJSON)
  value: JsonValue;
}

@InputType()
export class PatchRowInput extends GetRowInput {
  @Field(() => [PatchRow])
  patches: PatchRow[];
}
