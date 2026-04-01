import { Field, ObjectType } from '@nestjs/graphql';

@ObjectType()
export class SubscriptionModel {
  @Field()
  planId: string;

  @Field()
  status: string;

  @Field(() => String, { nullable: true })
  provider?: string | null;

  @Field(() => String, { nullable: true })
  currentPeriodStart?: string | null;

  @Field(() => String, { nullable: true })
  currentPeriodEnd?: string | null;

  @Field(() => String, { nullable: true })
  cancelAt?: string | null;
}
