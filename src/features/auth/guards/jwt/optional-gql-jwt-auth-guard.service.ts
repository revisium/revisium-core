import { CanActivate, ExecutionContext, Injectable } from '@nestjs/common';
import { OptionalGqlUniversalAuthGuard } from 'src/features/auth/guards/universal/gql-universal-auth.guard';

@Injectable()
export class OptionalGqlJwtAuthGuard implements CanActivate {
  constructor(private readonly universalGuard: OptionalGqlUniversalAuthGuard) {}

  canActivate(context: ExecutionContext) {
    return this.universalGuard.canActivate(context);
  }
}
