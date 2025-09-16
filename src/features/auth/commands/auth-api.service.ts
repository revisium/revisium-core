import { Injectable } from '@nestjs/common';
import { CommandBus } from '@nestjs/cqrs';
import {
  CheckOrganizationPermissionCommand,
  CheckOrganizationPermissionCommandData,
  CheckOrganizationPermissionCommandReturnType,
  CheckProjectPermissionCommand,
  CheckProjectPermissionCommandData,
  CheckProjectPermissionCommandReturnType,
  CheckSystemPermissionCommand,
  CheckSystemPermissionCommandData,
  CheckSystemPermissionCommandReturnType,
} from 'src/features/auth/commands/impl';
import { CacheService } from 'src/infrastructure/cache';
import { makeCacheKeyFromArgs } from 'src/utils/utils/stable-cache-key';

@Injectable()
export class AuthApiService {
  constructor(
    private readonly commandBus: CommandBus,
    private readonly cacheService: CacheService,
  ) {}

  public checkSystemPermission(data: CheckSystemPermissionCommandData) {
    return this.cacheService.getOrSet({
      key: makeCacheKeyFromArgs([data], {
        version: 1,
        prefix: 'auth:check-system-permission',
      }),
      ttl: '10m',
      factory: () => {
        return this.commandBus.execute<
          CheckSystemPermissionCommand,
          CheckSystemPermissionCommandReturnType
        >(new CheckSystemPermissionCommand(data));
      },
    });
  }

  public checkOrganizationPermission(
    data: CheckOrganizationPermissionCommandData,
  ) {
    return this.cacheService.getOrSet({
      key: makeCacheKeyFromArgs([data], {
        version: 1,
        prefix: 'auth:check-organization-permission',
      }),
      ttl: '10m',
      factory: () => {
        return this.commandBus.execute<
          CheckOrganizationPermissionCommand,
          CheckOrganizationPermissionCommandReturnType
        >(new CheckOrganizationPermissionCommand(data));
      },
    });
  }

  public checkProjectPermission(data: CheckProjectPermissionCommandData) {
    return this.cacheService.getOrSet({
      key: makeCacheKeyFromArgs([data], {
        version: 1,
        prefix: 'auth:check-project-permission',
      }),
      ttl: '10m',
      factory: () => {
        return this.commandBus.execute<
          CheckProjectPermissionCommand,
          CheckProjectPermissionCommandReturnType
        >(new CheckProjectPermissionCommand(data));
      },
    });
  }
}
