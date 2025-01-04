import { ExecutionContext, InternalServerErrorException } from '@nestjs/common';
import { CheckOrganizationPermissionCommand } from 'src/features/auth/commands/impl/check-organization-permission.command';
import { BasePermissionGuard } from 'src/features/auth/guards/base-persmission.guard';
import { IPermissionParams } from 'src/features/auth/guards/permission-params';

interface Params {
  organizationId?: string;
}

abstract class OrganizationGuard extends BasePermissionGuard<Params> {
  protected getCommand(
    params: {
      organizationId?: string;
    },
    permissions: IPermissionParams[],
    userId?: string,
  ) {
    if (!params.organizationId) {
      throw new InternalServerErrorException(
        `Not found organizationId=${params.organizationId}`,
      );
    }

    return new CheckOrganizationPermissionCommand({
      permissions,
      organizationId: params.organizationId,
      userId,
    });
  }
}

export class HTTPOrganizationGuard extends OrganizationGuard {
  protected getParams(context: ExecutionContext) {
    return this.getFromHttpContext(context);
  }
}

export class GQLOrganizationGuard extends OrganizationGuard {
  protected getParams(context: ExecutionContext) {
    return this.getFromGqlContext(context);
  }
}
