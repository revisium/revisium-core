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
import { CachedMethod } from 'src/infrastructure/cache-manager/method-cache.decorator';
import { makeCacheKeyFromArgs } from 'src/utils/utils/stable-cache-key';

@Injectable()
export class AuthApiService {
  constructor(private readonly commandBus: CommandBus) {}

  @CachedMethod({
    keyPrefix: `auth:check-system-permission`,
    makeKey: (args) =>
      makeCacheKeyFromArgs(args, {
        version: 1,
      }),
    ttlSec: 10 * 60,
  })
  public checkSystemPermission(data: CheckSystemPermissionCommandData) {
    return this.commandBus.execute<
      CheckSystemPermissionCommand,
      CheckSystemPermissionCommandReturnType
    >(new CheckSystemPermissionCommand(data));
  }

  @CachedMethod({
    keyPrefix: `auth:check-organization-permission`,
    makeKey: (args) =>
      makeCacheKeyFromArgs(args, {
        version: 1,
      }),
    ttlSec: 10 * 60,
  })
  public checkOrganizationPermission(
    data: CheckOrganizationPermissionCommandData,
  ) {
    return this.commandBus.execute<
      CheckOrganizationPermissionCommand,
      CheckOrganizationPermissionCommandReturnType
    >(new CheckOrganizationPermissionCommand(data));
  }

  @CachedMethod({
    keyPrefix: `auth:check-project-permission`,
    makeKey: (args) =>
      makeCacheKeyFromArgs(args, {
        version: 1,
      }),
    ttlSec: 10 * 60,
  })
  public checkProjectPermission(data: CheckProjectPermissionCommandData) {
    return this.commandBus.execute<
      CheckProjectPermissionCommand,
      CheckProjectPermissionCommandReturnType
    >(new CheckProjectPermissionCommand(data));
  }
}
