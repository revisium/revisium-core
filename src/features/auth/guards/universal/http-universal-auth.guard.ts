import {
  CanActivate,
  ExecutionContext,
  Injectable,
  UnauthorizedException,
} from '@nestjs/common';
import { AuthGuard } from '@nestjs/passport';
import { UniversalAuthService } from 'src/features/auth/guards/universal-auth.service';

@Injectable()
export class HttpJwtPassportGuard extends AuthGuard('jwt') {}

@Injectable()
export class OptionalHttpJwtPassportGuard extends AuthGuard('jwt') {
  handleRequest(_err: any, user: any) {
    return user;
  }
}

@Injectable()
export class HttpUniversalAuthGuard implements CanActivate {
  constructor(
    private readonly authService: UniversalAuthService,
    private readonly jwtGuard: HttpJwtPassportGuard,
  ) {}

  async canActivate(context: ExecutionContext): Promise<boolean> {
    const request = context.switchToHttp().getRequest();

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
export class OptionalHttpUniversalAuthGuard implements CanActivate {
  constructor(
    private readonly authService: UniversalAuthService,
    private readonly jwtGuard: OptionalHttpJwtPassportGuard,
  ) {}

  async canActivate(context: ExecutionContext): Promise<boolean> {
    const request = context.switchToHttp().getRequest();

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
