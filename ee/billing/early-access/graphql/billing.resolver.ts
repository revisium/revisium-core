import { UseGuards } from '@nestjs/common';
import {
  Args,
  Mutation,
  Parent,
  Query,
  ResolveField,
  Resolver,
} from '@nestjs/graphql';
import { OrganizationModel } from 'src/api/graphql-api/organization/model/organization.model';
import { PermissionAction, PermissionSubject } from 'src/features/auth/consts';
import { GqlJwtAuthGuard } from 'src/features/auth/guards/jwt/gql-jwt-auth-guard.service';
import { GQLOrganizationGuard } from 'src/features/auth/guards/organization.guard';
import { PermissionParams } from 'src/features/auth/guards/permission-params';
import { EarlyAccessService } from '../early-access.service';
import { ActivateEarlyAccessInput } from './inputs/activate-early-access.input';
import { PlanModel } from './models/plan.model';
import { SubscriptionModel } from './models/subscription.model';
import { UsageSummaryModel } from './models/usage.model';

@Resolver(() => OrganizationModel)
export class BillingOrganizationResolver {
  constructor(private readonly earlyAccessService: EarlyAccessService) {}

  @ResolveField(() => SubscriptionModel, { nullable: true })
  subscription(@Parent() parent: OrganizationModel) {
    return this.earlyAccessService.getOrgSubscription(parent.id);
  }

  @ResolveField(() => UsageSummaryModel, { nullable: true })
  usage(@Parent() parent: OrganizationModel) {
    return this.earlyAccessService.getOrgUsageSummary(parent.id);
  }
}

@Resolver()
export class BillingQueryResolver {
  constructor(private readonly earlyAccessService: EarlyAccessService) {}

  @Query(() => [PlanModel])
  plans() {
    return this.earlyAccessService.getPlans();
  }
}

@Resolver()
export class BillingMutationResolver {
  constructor(private readonly earlyAccessService: EarlyAccessService) {}

  @UseGuards(GqlJwtAuthGuard, GQLOrganizationGuard)
  @PermissionParams({
    action: PermissionAction.update,
    subject: PermissionSubject.Organization,
  })
  @Mutation(() => SubscriptionModel)
  activateEarlyAccess(@Args('data') data: ActivateEarlyAccessInput) {
    return this.earlyAccessService.activateEarlyAccess(
      data.organizationId,
      data.planId,
    );
  }
}
