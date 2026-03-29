import {
  CanActivate,
  ExecutionContext,
  ForbiddenException,
  Injectable,
} from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import { EE_FEATURE_KEY } from './decorators';
import { LicenseService } from './license.service';

@Injectable()
export class LicenseGuard implements CanActivate {
  constructor(
    private readonly reflector: Reflector,
    private readonly licenseService: LicenseService,
  ) {}

  canActivate(context: ExecutionContext): boolean {
    const feature = this.reflector.getAllAndOverride<string | undefined>(
      EE_FEATURE_KEY,
      [context.getHandler(), context.getClass()],
    );

    if (!feature) return true;

    if (!this.licenseService.hasFeature(feature)) {
      throw new ForbiddenException(
        `Enterprise feature "${feature}" requires a valid license`,
      );
    }

    return true;
  }
}
