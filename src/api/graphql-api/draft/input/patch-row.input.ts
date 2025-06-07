import { Field, InputType } from '@nestjs/graphql';
import GraphQLJSON from 'graphql-type-json';
import { Prisma } from '@prisma/client';
import { GetRowInput } from 'src/api/graphql-api/row/inputs/get-row.input';

@InputType()
export class PatchRow {
  @Field()
  path: string;

  @Field(() => GraphQLJSON)
  value: Prisma.InputJsonValue;
}

@InputType()
export class PatchRowInput extends GetRowInput {
  @Field(() => [PatchRow])
  patches: PatchRow[];
}
