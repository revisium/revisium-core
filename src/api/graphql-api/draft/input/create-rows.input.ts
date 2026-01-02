import { Field, InputType } from '@nestjs/graphql';
import { JSONResolver } from 'graphql-scalars';
import { ArrayMaxSize, ArrayNotEmpty, IsString } from 'class-validator';
import { Prisma } from 'src/__generated__/client';

@InputType()
export class CreateRowsRowInput {
  @Field()
  @IsString()
  rowId: string;

  @Field(() => JSONResolver)
  data: Prisma.InputJsonValue;
}

@InputType()
export class CreateRowsInput {
  @Field()
  revisionId: string;

  @Field()
  tableId: string;

  @Field(() => [CreateRowsRowInput])
  @ArrayNotEmpty({ message: 'rows array cannot be empty' })
  @ArrayMaxSize(1000, { message: 'rows array cannot exceed 1000 items' })
  rows: CreateRowsRowInput[];
}
