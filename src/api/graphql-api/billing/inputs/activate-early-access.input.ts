import { Field, ID, InputType } from '@nestjs/graphql';

@InputType()
export class ActivateEarlyAccessInput {
  @Field(() => ID)
  organizationId: string;

  @Field(() => ID)
  planId: string;
}
