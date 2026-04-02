import { Field, ObjectType } from '@nestjs/graphql';
import { DateTimeResolver } from 'graphql-scalars';
import { BillingStatus } from './billing-status.enum';

@ObjectType()
export class SubscriptionModel {
  @Field()
  planId: string;

  @Field(() => BillingStatus)
  status: BillingStatus;

  @Field(() => String, { nullable: true })
  provider?: string | null;

  @Field(() => String, { nullable: true })
  interval?: string | null;

  @Field(() => DateTimeResolver, { nullable: true })
  currentPeriodStart?: Date | null;

  @Field(() => DateTimeResolver, { nullable: true })
  currentPeriodEnd?: Date | null;

  @Field(() => DateTimeResolver, { nullable: true })
  cancelAt?: Date | null;
}
