import { Field, InputType } from '@nestjs/graphql';
import { JSONResolver } from 'graphql-scalars';
import { Prisma } from 'src/__generated__/client';
import { GetRowInput } from 'src/api/graphql-api/row/inputs/get-row.input';

@InputType()
export class UpdateRowInput extends GetRowInput {
  @Field(() => JSONResolver)
  data: Prisma.InputJsonValue;
}
