import {
  CanActivate,
  ExecutionContext,
  Injectable,
  UnauthorizedException,
} from '@nestjs/common';
import { AuthGuard } from '@nestjs/passport';
import { GqlExecutionContext } from '@nestjs/graphql';
import { UniversalAuthService } from 'src/features/auth/guards/universal-auth.service';

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

  handleRequest(err: any, user: any) {
    if (err) {
      return err;
    }
    return user || null;
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

    if (this.authService.isNoAuthEnabled) {
      request.user = this.authService.adminUser;
      return true;
    }

    const user = await this.authService.authenticate(
      request.headers,
      request.query,
      request.ip,
    );

    if (user) {
      request.user = user;
      return true;
    }

    if (request.headers['authorization']) {
      return this.jwtGuard.canActivate(context) as Promise<boolean>;
    }

    throw new UnauthorizedException();
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

    if (this.authService.isNoAuthEnabled) {
      request.user = this.authService.adminUser;
      return true;
    }

    const user = await this.authService.authenticate(
      request.headers,
      request.query,
      request.ip,
    );

    if (user) {
      request.user = user;
      return true;
    }

    if (request.headers['authorization']) {
      return this.jwtGuard.canActivate(context) as Promise<boolean>;
    }

    return true;
  }
}
