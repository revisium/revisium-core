import { Injectable, UnauthorizedException } from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import { Request } from 'express';
import { JwtSecretService } from 'src/features/auth/jwt-secret.service';
import { NoAuthService } from 'src/features/auth/no-auth.service';
import { OAuthTokenService } from 'src/features/oauth/oauth-token.service';

export interface McpUserContext {
  userId: string;
  username: string;
  email: string;
  roleId: string | null;
}

@Injectable()
export class McpAuthService {
  constructor(
    private readonly noAuth: NoAuthService,
    private readonly jwtService: JwtService,
    private readonly jwtSecret: JwtSecretService,
    private readonly oauthToken: OAuthTokenService,
  ) {}

  async extractUserContext(req: Request): Promise<McpUserContext> {
    if (this.noAuth.enabled) {
      const admin = this.noAuth.adminUser;
      return {
        userId: admin.userId,
        username: admin.userId,
        email: admin.email,
        roleId: 'systemAdmin',
      };
    }

    const authHeader = req.headers['authorization'];
    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      throw new UnauthorizedException('Missing Authorization header');
    }

    const token = authHeader.slice(7);

    if (token.split('.').length === 3) {
      return this.validateJwt(token);
    }

    if (token.startsWith('oat_')) {
      return this.validateOAuthToken(token);
    }

    throw new UnauthorizedException('Unrecognized token format');
  }

  private validateJwt(token: string): McpUserContext {
    try {
      const payload = this.jwtService.verify(token, {
        secret: this.jwtSecret.secret,
      });
      return {
        userId: payload.sub,
        username: payload.username ?? '',
        email: payload.email ?? '',
        roleId: payload.roleId ?? null,
      };
    } catch {
      throw new UnauthorizedException('Invalid or expired JWT');
    }
  }

  private async validateOAuthToken(token: string): Promise<McpUserContext> {
    const tokenData = await this.oauthToken.validateAccessToken(token);
    return {
      userId: tokenData.userId,
      username: tokenData.username,
      email: tokenData.email,
      roleId: tokenData.roleId,
    };
  }
}
