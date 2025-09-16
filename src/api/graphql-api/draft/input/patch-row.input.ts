import { Field, InputType } from '@nestjs/graphql';
import { JSONResolver } from 'graphql-scalars';
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

  @Field(() => JSONResolver)
  value: JsonValue;
}

@InputType()
export class PatchRowInput extends GetRowInput {
  @Field(() => [PatchRow])
  patches: PatchRow[];
}
