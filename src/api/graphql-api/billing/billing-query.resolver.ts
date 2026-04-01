import { Inject } from '@nestjs/common';
import { Args, Query, Resolver } from '@nestjs/graphql';
import {
  BILLING_GRAPHQL_SERVICE_TOKEN,
  IBillingGraphqlService,
} from 'src/features/billing/billing-graphql.interface';
import { PaymentProviderModel } from './models/payment-provider.model';
import { PlanModel } from './models/plan.model';

@Resolver()
export class BillingQueryResolver {
  constructor(
    @Inject(BILLING_GRAPHQL_SERVICE_TOKEN)
    private readonly billingService: IBillingGraphqlService,
  ) {}

  @Query(() => [PlanModel])
  plans() {
    return this.billingService.getPlans();
  }

  @Query(() => [PaymentProviderModel])
  availableProviders(
    @Args('country', { nullable: true }) country?: string,
    @Args('method', { nullable: true }) method?: string,
  ) {
    return this.billingService.getAvailableProviders(country, method);
  }
}
