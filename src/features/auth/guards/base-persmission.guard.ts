import {
  CanActivate,
  ExecutionContext,
  ForbiddenException,
  Injectable,
  InternalServerErrorException,
  NotFoundException,
} from '@nestjs/common';
import { ForbiddenError } from '@casl/ability';
import { Reflector } from '@nestjs/core';
import { GqlExecutionContext } from '@nestjs/graphql';
import { ApiKeyScopeService } from 'src/features/api-key/api-key-scope.service';
import { CaslAbilityFactory } from 'src/features/auth/casl-ability.factory';
import { AuthApiService } from 'src/features/auth/commands/auth-api.service';
import {
  PERMISSION_PARAMS_KEY,
  IPermissionParams,
} from 'src/features/auth/guards/permission-params';
import { ICaslRule, IOptionalAuthUser } from 'src/features/auth/types';

@Injectable()
export abstract class BasePermissionGuard<
  T = Record<string, never>,
> implements CanActivate {
  constructor(
    protected reflector: Reflector,
    protected authApi: AuthApiService,
    protected apiKeyScopeService: ApiKeyScopeService,
    protected caslAbilityFactory: CaslAbilityFactory,
  ) {}

  protected getFromHttpContext(context: ExecutionContext) {
    return context.switchToHttp().getRequest<{
      user: IOptionalAuthUser;
      params: T;
    }>();
  }

  protected getFromGqlContext(context: ExecutionContext) {
    const gqlContext = GqlExecutionContext.create(context);
    const user = gqlContext.getContext<{ req: { user: IOptionalAuthUser } }>()
      .req.user;
    const args = gqlContext.getArgs<{ data: T }>();

    return {
      user,
      params: args.data ?? ({} as T),
    };
  }

  protected abstract getParams(context: ExecutionContext): {
    user: IOptionalAuthUser;
    params: T;
  };

  protected abstract executeCommand(
    params: T,
    permissions: IPermissionParams[],
    userId?: string,
  ): Promise<boolean>;

  async canActivate(context: ExecutionContext): Promise<boolean> {
    const permissions = this.extractPermissions(context);
    const { user, params } = this.getParams(context);

    if (!params) {
      throw new NotFoundException('Required parameters not found');
    }

    if (user?.authMethod === 'internal_key') {
      return true;
    }

    if (user?.apiKeyReadOnly) {
      this.checkReadOnly(permissions);
    }

    if (user?.authMethod === 'service_key' && user.serviceKeyPermissions) {
      this.checkServiceKeyPermissions(
        user.serviceKeyPermissions.rules,
        permissions,
      );
    } else {
      await this.checkRolePermissions(params, permissions, user?.userId);
    }

    if (user?.apiKeyId && user.apiKeyScope) {
      await this.validateApiKeyScope(user, params);
    }

    return true;
  }

  private extractPermissions(context: ExecutionContext): IPermissionParams[] {
    const permissions: IPermissionParams[] = [];

    const classPermission = this.reflector.get<IPermissionParams | undefined>(
      PERMISSION_PARAMS_KEY,
      context.getClass(),
    );

    if (classPermission) {
      permissions.push(classPermission);
    }

    const methodPermission = this.reflector.get<IPermissionParams | undefined>(
      PERMISSION_PARAMS_KEY,
      context.getHandler(),
    );

    if (methodPermission) {
      permissions.push(methodPermission);
    }

    return permissions;
  }

  private checkReadOnly(permissions: IPermissionParams[]): void {
    const writeActions = new Set([
      'create',
      'update',
      'delete',
      'revert',
      'add',
    ]);
    for (const permission of permissions) {
      if (writeActions.has(permission.action)) {
        throw new ForbiddenException(
          `API key is read-only: ${permission.action} on ${permission.subject} is not allowed`,
        );
      }
    }
  }

  private checkServiceKeyPermissions(
    rules: ICaslRule[],
    permissions: IPermissionParams[],
  ): void {
    const ability = this.caslAbilityFactory.createFromRules(rules);

    try {
      for (const permission of permissions) {
        ForbiddenError.from(ability)
          .setMessage(
            `You are not allowed to ${permission.action} on ${permission.subject}`,
          )
          .throwUnlessCan(permission.action, permission.subject);
      }
    } catch (e) {
      if (e instanceof Error) {
        throw new ForbiddenException(e.message);
      }
      throw new InternalServerErrorException();
    }
  }

  private async checkRolePermissions(
    params: T,
    permissions: IPermissionParams[],
    userId?: string,
  ): Promise<void> {
    try {
      await this.executeCommand(params, permissions, userId);
    } catch (e) {
      if (e instanceof NotFoundException) {
        throw e;
      }
      if (e instanceof Error) {
        throw new ForbiddenException(e.message);
      } else {
        throw new InternalServerErrorException();
      }
    }
  }

  protected async validateApiKeyScope(
    user: NonNullable<IOptionalAuthUser>,
    params: T,
  ): Promise<void> {
    const scopeRequest = this.buildScopeRequest(params);
    if (!scopeRequest) {
      return;
    }

    let resolvedBranchNames: string[] | undefined;
    if (
      user.apiKeyScope!.branchNames.length > 0 &&
      scopeRequest.branchName &&
      scopeRequest.projectId
    ) {
      resolvedBranchNames = await this.apiKeyScopeService.resolveBranchNames(
        user.apiKeyScope!.branchNames,
        scopeRequest.projectId,
      );
    }

    const isValid = this.apiKeyScopeService.validateScope(
      user.apiKeyScope!,
      scopeRequest,
      resolvedBranchNames,
    );

    if (!isValid) {
      throw new ForbiddenException(
        'API key scope does not allow access to this resource',
      );
    }
  }

  protected buildScopeRequest(_params: T): {
    organizationId?: string;
    projectId?: string;
    branchName?: string;
    tableId?: string;
  } | null {
    return null;
  }
}
