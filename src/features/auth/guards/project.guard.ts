import { ExecutionContext, NotFoundException } from '@nestjs/common';
import { BasePermissionGuard } from 'src/features/auth/guards/base-persmission.guard';
import { IPermissionParams } from 'src/features/auth/guards/permission-params';

interface Params {
  organizationId?: string;
  projectName?: string;
  revisionId?: string;
  endpointId?: string;
}

abstract class ProjectGuard extends BasePermissionGuard<Params> {
  protected executeCommand(
    params: {
      organizationId?: string;
      projectName?: string;
      revisionId?: string;
      endpointId?: string;
    },
    permissions: IPermissionParams[],
    userId?: string,
  ) {
    const data = this.getData(params, permissions, userId);
    return this.authApi.checkProjectPermission(data);
  }

  protected getData(
    params: {
      organizationId?: string;
      projectName?: string;
      revisionId?: string;
      endpointId?: string;
    },
    permissions: IPermissionParams[],
    userId?: string,
  ) {
    if (params.organizationId && params.projectName) {
      return {
        permissions,
        organizationId: params.organizationId,
        projectName: params.projectName,
        userId,
      };
    } else if (params.revisionId) {
      return {
        permissions,
        revisionId: params.revisionId,
        userId,
      };
    } else if (params.endpointId) {
      return {
        permissions,
        endpointId: params.endpointId,
        userId,
      };
    } else {
      throw new NotFoundException(params);
    }
  }
}

export class HTTPProjectGuard extends ProjectGuard {
  protected getParams(context: ExecutionContext) {
    return this.getFromHttpContext(context);
  }
}

export class GQLProjectGuard extends ProjectGuard {
  protected getParams(context: ExecutionContext) {
    return this.getFromGqlContext(context);
  }
}
