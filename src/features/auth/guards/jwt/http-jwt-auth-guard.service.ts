import { CanActivate, ExecutionContext, Injectable } from '@nestjs/common';
import { HttpUniversalAuthGuard } from 'src/features/auth/guards/universal/http-universal-auth.guard';

@Injectable()
export class HttpJwtAuthGuard implements CanActivate {
  constructor(private readonly universalGuard: HttpUniversalAuthGuard) {}

  canActivate(context: ExecutionContext) {
    return this.universalGuard.canActivate(context);
  }
}
