import { ExecutionContext } from '@nestjs/common';
import { CheckSystemPermissionCommand } from 'src/auth/commands/impl';
import { BasePermissionGuard } from 'src/auth/guards/base-persmission.guard';
import { IPermissionParams } from 'src/auth/guards/permission-params';

abstract class SystemGuard extends BasePermissionGuard {
  protected getCommand(
    _: Record<string, never>,
    permissions: IPermissionParams[],
    userId?: string,
  ) {
    return new CheckSystemPermissionCommand({
      permissions,
      userId,
    });
  }
}

export class HTTPSystemGuard extends SystemGuard {
  protected getParams(context: ExecutionContext) {
    return this.getFromHttpContext(context);
  }
}

export class GQLSystemGuard extends SystemGuard {
  protected getParams(context: ExecutionContext) {
    return this.getFromGqlContext(context);
  }
}
