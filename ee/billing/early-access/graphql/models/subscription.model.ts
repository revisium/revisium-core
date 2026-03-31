import { Field, ObjectType } from '@nestjs/graphql';
import { DateTimeResolver } from 'graphql-scalars';

@ObjectType()
export class SubscriptionModel {
  @Field()
  id: string;

  @Field()
  organizationId: string;

  @Field()
  planId: string;

  @Field()
  status: string;

  @Field(() => String, { nullable: true })
  interval?: string | null;

  @Field(() => DateTimeResolver, { nullable: true })
  currentPeriodStart?: Date | null;

  @Field(() => DateTimeResolver, { nullable: true })
  currentPeriodEnd?: Date | null;

  @Field(() => DateTimeResolver, { nullable: true })
  cancelAt?: Date | null;
}
