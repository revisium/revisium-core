import {
  CanActivate,
  ExecutionContext,
  ForbiddenException,
  Injectable,
  InternalServerErrorException,
  NotFoundException,
} from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import { CommandBus } from '@nestjs/cqrs';
import { GqlExecutionContext } from '@nestjs/graphql';
import {
  PERMISSION_PARAMS_KEY,
  IPermissionParams,
} from 'src/auth/guards/permission-params';
import { IOptionalAuthUser } from 'src/auth/types';

@Injectable()
export abstract class BasePermissionGuard<T = Record<string, never>>
  implements CanActivate
{
  constructor(
    protected reflector: Reflector,
    protected commandBus: CommandBus,
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
      params: args.data,
    };
  }

  protected abstract getParams(context: ExecutionContext): {
    user: IOptionalAuthUser;
    params: T;
  };

  protected abstract getCommand(
    params: T,
    permissions: IPermissionParams[],
    userId?: string,
  ): any;

  async canActivate(context: ExecutionContext): Promise<boolean> {
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

    const { user, params } = this.getParams(context);

    if (!params) {
      throw new NotFoundException('Required parameters not found');
    }

    try {
      const command = this.getCommand(params, permissions, user?.userId);
      await this.commandBus.execute(command);
    } catch (e) {
      console.error(e);

      if (e instanceof Error) {
        throw new ForbiddenException(e.message);
      } else {
        throw new InternalServerErrorException();
      }
    }

    return true;
  }
}
