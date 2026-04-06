import { CanActivate, ExecutionContext, Injectable } from '@nestjs/common';
import { GqlUniversalAuthGuard } from 'src/features/auth/guards/universal/gql-universal-auth.guard';

@Injectable()
export class GqlJwtAuthGuard implements CanActivate {
  constructor(private readonly universalGuard: GqlUniversalAuthGuard) {}

  canActivate(context: ExecutionContext) {
    return this.universalGuard.canActivate(context);
  }
}
