import { Field, InputType } from '@nestjs/graphql';
import { JSONResolver } from 'graphql-scalars';
import { Prisma } from 'src/__generated__/client';

@InputType()
export class ApplyMigrationsInput {
  @Field()
  revisionId: string;

  @Field(() => [JSONResolver])
  migrations: Prisma.JsonValue[];
}
