import { Field, InputType, Int } from '@nestjs/graphql';
import { Prisma } from 'src/__generated__/client';

@InputType()
export class GetBranchRevisionsInput {
  @Field(() => Int)
  first: number;

  @Field({ nullable: true })
  after?: string;

  @Field({ nullable: true })
  before?: string;

  @Field(() => Boolean, { nullable: true })
  inclusive?: boolean;

  @Field(() => Prisma.SortOrder, {
    nullable: true,
    description: 'Sort order: asc (default) or desc',
  })
  sort?: Prisma.SortOrder;

  @Field({ nullable: true })
  comment?: string;
}
