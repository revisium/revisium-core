import { ExecutionContext, Injectable } from '@nestjs/common';
import { GqlExecutionContext } from '@nestjs/graphql';
import { AuthGuard } from '@nestjs/passport';
import { NoAuthService } from 'src/features/auth/no-auth.service';

@Injectable()
export class OptionalGqlJwtAuthGuard extends AuthGuard('jwt') {
  constructor(private readonly noAuth: NoAuthService) {
    super();
  }

  canActivate(context: ExecutionContext) {
    if (this.noAuth.enabled) {
      GqlExecutionContext.create(context).getContext().req.user =
        this.noAuth.adminUser;
      return true;
    }
    return super.canActivate(context);
  }

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
