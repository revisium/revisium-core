import { Inject } from '@nestjs/common';
import { Parent, ResolveField, Resolver } from '@nestjs/graphql';
import { ConfigurationModel } from 'src/api/graphql-api/configuration/model';
import {
  BILLING_GRAPHQL_SERVICE_TOKEN,
  IBillingGraphqlService,
} from 'src/features/billing/billing-graphql.interface';
import { BillingConfigurationModel } from './models';

@Resolver(() => ConfigurationModel)
export class BillingConfigurationResolver {
  constructor(
    @Inject(BILLING_GRAPHQL_SERVICE_TOKEN)
    private readonly billingService: IBillingGraphqlService,
  ) {}

  @ResolveField(() => BillingConfigurationModel)
  billing(@Parent() _parent: ConfigurationModel) {
    return this.billingService.getBillingConfiguration();
  }
}
