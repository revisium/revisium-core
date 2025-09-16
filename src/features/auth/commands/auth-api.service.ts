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
import { AuthCacheService } from 'src/infrastructure/cache/services/auth-cache.service';

@Injectable()
export class AuthApiService {
  constructor(
    private readonly commandBus: CommandBus,
    private readonly authCache: AuthCacheService,
  ) {}

  public checkSystemPermission(data: CheckSystemPermissionCommandData) {
    return this.authCache.systemPermissionCheck(data, () => {
      return this.commandBus.execute<
        CheckSystemPermissionCommand,
        CheckSystemPermissionCommandReturnType
      >(new CheckSystemPermissionCommand(data));
    });
  }

  public checkOrganizationPermission(
    data: CheckOrganizationPermissionCommandData,
  ) {
    return this.authCache.organizationPermissionCheck(data, () => {
      return this.commandBus.execute<
        CheckOrganizationPermissionCommand,
        CheckOrganizationPermissionCommandReturnType
      >(new CheckOrganizationPermissionCommand(data));
    });
  }

  public checkProjectPermission(data: CheckProjectPermissionCommandData) {
    return this.authCache.projectPermissionCheck(data, () => {
      return this.commandBus.execute<
        CheckProjectPermissionCommand,
        CheckProjectPermissionCommandReturnType
      >(new CheckProjectPermissionCommand(data));
    });
  }
}
