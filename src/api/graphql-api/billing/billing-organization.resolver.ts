import { Inject } from '@nestjs/common';
import { Parent, ResolveField, Resolver } from '@nestjs/graphql';
import { OrganizationModel } from 'src/api/graphql-api/organization/model/organization.model';
import {
  BILLING_GRAPHQL_SERVICE_TOKEN,
  IBillingGraphqlService,
} from 'src/features/billing/billing-graphql.interface';
import { SubscriptionModel } from './models/subscription.model';
import { UsageSummaryModel } from './models/usage.model';

@Resolver(() => OrganizationModel)
export class BillingOrganizationResolver {
  constructor(
    @Inject(BILLING_GRAPHQL_SERVICE_TOKEN)
    private readonly billingService: IBillingGraphqlService,
  ) {}

  @ResolveField(() => SubscriptionModel, { nullable: true })
  subscription(@Parent() parent: OrganizationModel) {
    return this.billingService.getSubscription(parent.id);
  }

  @ResolveField(() => UsageSummaryModel, { nullable: true })
  usage(@Parent() parent: OrganizationModel) {
    return this.billingService.getUsage(parent.id);
  }
}
