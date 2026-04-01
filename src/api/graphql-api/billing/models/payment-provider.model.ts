import { Field, ID, ObjectType } from '@nestjs/graphql';

@ObjectType()
export class PaymentProviderModel {
  @Field(() => ID)
  id: string;

  @Field()
  name: string;

  @Field(() => [String])
  methods: string[];

  @Field()
  supportsRecurring: boolean;
}

@ObjectType()
export class CheckoutResultModel {
  @Field()
  checkoutUrl: string;
}

@ObjectType()
export class PortalResultModel {
  @Field(() => String, { nullable: true })
  url?: string | null;

  @Field()
  supported: boolean;
}
