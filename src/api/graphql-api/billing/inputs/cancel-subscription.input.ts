import { Field, ID, InputType } from '@nestjs/graphql';

@InputType()
export class CancelSubscriptionInput {
  @Field(() => ID)
  organizationId: string;

  @Field({ nullable: true })
  cancelAtPeriodEnd?: boolean;
}
