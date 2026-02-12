import { ExecutionContext, Injectable } from '@nestjs/common';
import { AuthGuard } from '@nestjs/passport';
import { NoAuthService } from 'src/features/auth/no-auth.service';

@Injectable()
export class HttpJwtAuthGuard extends AuthGuard('jwt') {
  constructor(private readonly noAuth: NoAuthService) {
    super();
  }

  canActivate(context: ExecutionContext) {
    if (this.noAuth.enabled) {
      context.switchToHttp().getRequest().user = this.noAuth.adminUser;
      return true;
    }
    return super.canActivate(context);
  }
}
