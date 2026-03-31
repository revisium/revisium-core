import { Field, InputType } from '@nestjs/graphql';

@InputType()
export class ActivateEarlyAccessInput {
  @Field()
  organizationId: string;

  @Field()
  planId: string;
}
