import { Injectable, UnauthorizedException } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { JwtService } from '@nestjs/jwt';
import * as bcrypt from 'bcrypt';
import type { StringValue } from 'ms';
import * as crypto from 'node:crypto';
import { JwtSecretService } from 'src/features/auth/jwt-secret.service';
import {
  RefreshTokenMeta,
  RefreshTokenService,
} from 'src/features/auth/services/refresh-token.service';
import { PrismaService } from 'src/infrastructure/database/prisma.service';

const DEFAULT_ACCESS_TOKEN_TTL = '30m';
const DEFAULT_ACCESS_TOKEN_EXPIRES_IN_SECONDS = 30 * 60;

type AccessTokenClaims = {
  username?: string | null;
  email?: string | null;
  sub: string;
  ver?: number;
};

export type AccessTokenResult = {
  accessToken: string;
  expiresIn: number;
};

export type IssuedTokens = AccessTokenResult & {
  refreshToken: string | null;
};

export type IssueTokensUser = {
  id: string;
  username: string | null;
  email: string | null;
  tokenVersion: number;
};

@Injectable()
export class AuthService {
  constructor(
    private readonly jwtService: JwtService,
    private readonly jwtSecret: JwtSecretService,
    private readonly configService: ConfigService,
    private readonly refreshTokenService: RefreshTokenService,
    private readonly prisma: PrismaService,
  ) {}

  public login(payload: AccessTokenClaims): string {
    return this.signAccessToken(payload).accessToken;
  }

  public async issueTokens(
    user: IssueTokensUser,
    meta?: RefreshTokenMeta,
  ): Promise<IssuedTokens> {
    const access = this.signAccessToken({
      sub: user.id,
      username: user.username,
      email: user.email,
      ver: user.tokenVersion,
    });
    const refreshToken = await this.refreshTokenService.createToken(
      user.id,
      undefined,
      meta,
    );
    return { ...access, refreshToken };
  }

  public async issueAccessTokenForUserId(
    userId: string,
  ): Promise<AccessTokenResult> {
    const user = await this.prisma.user.findUnique({
      where: { id: userId },
      select: {
        id: true,
        username: true,
        email: true,
        tokenVersion: true,
      },
    });
    if (!user) {
      throw new UnauthorizedException('User not found');
    }
    return this.signAccessToken({
      sub: user.id,
      username: user.username,
      email: user.email,
      ver: user.tokenVersion,
    });
  }

  public signAccessToken(payload: AccessTokenClaims): AccessTokenResult {
    const expiresIn =
      this.configService.get<string>('JWT_ACCESS_TOKEN_TTL') ??
      DEFAULT_ACCESS_TOKEN_TTL;

    const accessToken = this.jwtService.sign(
      { ...payload },
      {
        secret: this.jwtSecret.secret,
        expiresIn: expiresIn as StringValue,
      },
    );

    return {
      accessToken,
      expiresIn: this.resolveExpiresInSeconds(expiresIn),
    };
  }

  public hashPassword(password: string) {
    return bcrypt.hash(password, 10);
  }

  public comparePassword(password: string, hash: string) {
    return bcrypt.compare(password, hash);
  }

  public generateConfirmationCode(): string {
    return crypto.randomUUID().toString();
  }

  private resolveExpiresInSeconds(ttl: string): number {
    const trimmed = ttl.trim();
    const match = /^(\d+)([smhd]?)$/.exec(trimmed);
    if (!match) {
      return DEFAULT_ACCESS_TOKEN_EXPIRES_IN_SECONDS;
    }
    const value = Number(match[1]);
    const unit = match[2] || 's';
    const multiplierByUnit: Record<string, number> = {
      s: 1,
      m: 60,
      h: 60 * 60,
      d: 24 * 60 * 60,
    };
    return value * (multiplierByUnit[unit] ?? 1);
  }
}
