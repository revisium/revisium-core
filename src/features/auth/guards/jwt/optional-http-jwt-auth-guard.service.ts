import { CanActivate, ExecutionContext, Injectable } from '@nestjs/common';
import { OptionalHttpUniversalAuthGuard } from 'src/features/auth/guards/universal/http-universal-auth.guard';

@Injectable()
export class OptionalHttpJwtAuthGuard implements CanActivate {
  constructor(
    private readonly universalGuard: OptionalHttpUniversalAuthGuard,
  ) {}

  canActivate(context: ExecutionContext) {
    return this.universalGuard.canActivate(context);
  }
}
