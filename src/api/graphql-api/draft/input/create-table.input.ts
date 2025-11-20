import { Field, InputType } from '@nestjs/graphql';
import { Prisma } from 'src/__generated__/client';
import { JSONResolver } from 'graphql-scalars';

@InputType()
export class CreateTableInput {
  @Field()
  revisionId: string;

  @Field()
  tableId: string;

  @Field(() => JSONResolver)
  schema: Prisma.InputJsonValue;
}
