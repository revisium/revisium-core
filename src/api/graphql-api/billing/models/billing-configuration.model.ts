import { Field, ObjectType } from '@nestjs/graphql';

@ObjectType()
export class BillingConfigurationModel {
  @Field(() => Boolean)
  enabled: boolean;

  @Field(() => Boolean)
  earlyAccess: boolean;
}
