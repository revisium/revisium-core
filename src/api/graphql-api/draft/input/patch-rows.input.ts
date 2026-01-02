import { Field, InputType } from '@nestjs/graphql';
import { ArrayMaxSize, ArrayNotEmpty, IsString } from 'class-validator';
import { PatchRow } from 'src/api/graphql-api/draft/input/patch-row.input';

@InputType()
export class PatchRowsRowInput {
  @Field()
  @IsString()
  rowId: string;

  @Field(() => [PatchRow])
  @ArrayNotEmpty({ message: 'patches array cannot be empty' })
  patches: PatchRow[];
}

@InputType()
export class PatchRowsInput {
  @Field()
  revisionId: string;

  @Field()
  tableId: string;

  @Field(() => [PatchRowsRowInput])
  @ArrayNotEmpty({ message: 'rows array cannot be empty' })
  @ArrayMaxSize(1000, { message: 'rows array cannot exceed 1000 items' })
  rows: PatchRowsRowInput[];
}
