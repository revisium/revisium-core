import { Field, ID, InputType } from '@nestjs/graphql';

@InputType()
export class CreateCheckoutInput {
  @Field(() => ID)
  organizationId: string;

  @Field(() => ID)
  planId: string;

  @Field({ nullable: true })
  interval?: string;

  @Field({ nullable: true })
  providerId?: string;

  @Field({ nullable: true })
  country?: string;

  @Field({ nullable: true })
  method?: string;

  @Field()
  successUrl: string;

  @Field()
  cancelUrl: string;
}
