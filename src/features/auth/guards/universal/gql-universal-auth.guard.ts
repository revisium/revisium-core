import {
  CanActivate,
  ExecutionContext,
  Injectable,
  UnauthorizedException,
} from '@nestjs/common';
import { AuthGuard } from '@nestjs/passport';
import { GqlExecutionContext } from '@nestjs/graphql';
import { UniversalAuthService } from 'src/features/auth/guards/universal-auth.service';
import { handleOptionalJwtRequest } from 'src/features/auth/guards/universal/optional-jwt-handle-request';

@Injectable()
export class GqlJwtPassportGuard extends AuthGuard('jwt') {
  getRequest(context: ExecutionContext) {
    const ctx = GqlExecutionContext.create(context);
    return ctx.getContext().req;
  }
}

@Injectable()
export class OptionalGqlJwtPassportGuard extends AuthGuard('jwt') {
  getRequest(context: ExecutionContext) {
    const ctx = GqlExecutionContext.create(context);
    return ctx.getContext().req;
  }

  handleRequest<TUser = unknown>(
    err: unknown,
    user: TUser | false | null | undefined,
    _info?: unknown,
    _context?: ExecutionContext,
    _status?: unknown,
  ): TUser {
    return handleOptionalJwtRequest(err, user);
  }
}

@Injectable()
export class GqlUniversalAuthGuard implements CanActivate {
  constructor(
    private readonly authService: UniversalAuthService,
    private readonly jwtGuard: GqlJwtPassportGuard,
  ) {}

  async canActivate(context: ExecutionContext): Promise<boolean> {
    const ctx = GqlExecutionContext.create(context);
    const request = ctx.getContext().req;
    const result = await this.authService.authenticateRequest(request);

    if (result === 'jwt') {
      return this.jwtGuard.canActivate(context) as Promise<boolean>;
    }
    if (result === 'anonymous') {
      throw new UnauthorizedException();
    }
    return true;
  }
}

@Injectable()
export class OptionalGqlUniversalAuthGuard implements CanActivate {
  constructor(
    private readonly authService: UniversalAuthService,
    private readonly jwtGuard: OptionalGqlJwtPassportGuard,
  ) {}

  async canActivate(context: ExecutionContext): Promise<boolean> {
    const ctx = GqlExecutionContext.create(context);
    const request = ctx.getContext().req;
    const result = await this.authService.authenticateRequest(request);

    if (result === 'jwt') {
      return this.jwtGuard.canActivate(context) as Promise<boolean>;
    }
    return true;
  }
}
