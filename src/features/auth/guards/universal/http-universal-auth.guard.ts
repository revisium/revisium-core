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
export class OptionalHttpUniversalAuthGuard implements CanActivate {
  constructor(
    private readonly authService: UniversalAuthService,
    private readonly jwtGuard: OptionalHttpJwtPassportGuard,
  ) {}

  async canActivate(context: ExecutionContext): Promise<boolean> {
    const request = context.switchToHttp().getRequest();
    const result = await this.authService.authenticateRequest(request);

    if (result === 'jwt') {
      return this.jwtGuard.canActivate(context) as Promise<boolean>;
    }
    return true;
  }
}
