import { UseGuards } from '@nestjs/common';
import { Mutation, Query, Resolver } from '@nestjs/graphql';
import { PermissionAction, PermissionSubject } from 'src/features/auth/consts';
import { GqlJwtAuthGuard } from 'src/features/auth/guards/jwt/gql-jwt-auth-guard.service';
import { PermissionParams } from 'src/features/auth/guards/permission-params';
import { GQLSystemGuard } from 'src/features/auth/guards/system.guard';
import { CacheManagementService } from 'src/infrastructure/cache/services/cache-management.service';
import { CacheStatsModel } from 'src/api/graphql-api/cache/model/cache-stats.model';

@UseGuards(GqlJwtAuthGuard, GQLSystemGuard)
@Resolver()
export class CacheResolver {
  constructor(
    private readonly cacheManagementService: CacheManagementService,
  ) {}

  @PermissionParams({
    action: PermissionAction.read,
    subject: PermissionSubject.Cache,
  })
  @Query(() => CacheStatsModel)
  async adminCacheStats(): Promise<CacheStatsModel> {
    return this.cacheManagementService.getStats();
  }

  @PermissionParams({
    action: PermissionAction.manage,
    subject: PermissionSubject.Cache,
  })
  @Mutation(() => Boolean)
  async adminResetAllCache(): Promise<boolean> {
    return this.cacheManagementService.clearAll();
  }
}
