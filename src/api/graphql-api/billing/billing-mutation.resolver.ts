import { Inject, UseGuards } from '@nestjs/common';
import { Args, Mutation, Resolver } from '@nestjs/graphql';
import { PermissionAction, PermissionSubject } from 'src/features/auth/consts';
import { GqlJwtAuthGuard } from 'src/features/auth/guards/jwt/gql-jwt-auth-guard.service';
import { GQLOrganizationGuard } from 'src/features/auth/guards/organization.guard';
import { PermissionParams } from 'src/features/auth/guards/permission-params';
import {
  BILLING_GRAPHQL_SERVICE_TOKEN,
  IBillingGraphqlService,
} from 'src/features/billing/billing-graphql.interface';
import { ActivateEarlyAccessInput } from './inputs/activate-early-access.input';
import { CancelSubscriptionInput } from './inputs/cancel-subscription.input';
import { CreateCheckoutInput } from './inputs/create-checkout.input';
import { CheckoutResultModel } from './models/payment-provider.model';
import { SubscriptionModel } from './models/subscription.model';

@Resolver()
export class BillingMutationResolver {
  constructor(
    @Inject(BILLING_GRAPHQL_SERVICE_TOKEN)
    private readonly billingService: IBillingGraphqlService,
  ) {}

  @UseGuards(GqlJwtAuthGuard, GQLOrganizationGuard)
  @PermissionParams({
    action: PermissionAction.update,
    subject: PermissionSubject.Organization,
  })
  @Mutation(() => SubscriptionModel)
  activateEarlyAccess(@Args('data') data: ActivateEarlyAccessInput) {
    return this.billingService.activateEarlyAccess(
      data.organizationId,
      data.planId,
    );
  }

  @UseGuards(GqlJwtAuthGuard, GQLOrganizationGuard)
  @PermissionParams({
    action: PermissionAction.update,
    subject: PermissionSubject.Organization,
  })
  @Mutation(() => CheckoutResultModel)
  createCheckout(@Args('data') data: CreateCheckoutInput) {
    return this.billingService.createCheckout(data);
  }

  @UseGuards(GqlJwtAuthGuard, GQLOrganizationGuard)
  @PermissionParams({
    action: PermissionAction.update,
    subject: PermissionSubject.Organization,
  })
  @Mutation(() => Boolean)
  cancelSubscription(@Args('data') data: CancelSubscriptionInput) {
    return this.billingService.cancelSubscription(
      data.organizationId,
      data.cancelAtPeriodEnd,
    );
  }
}
