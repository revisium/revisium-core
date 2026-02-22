import {
  Controller,
  Get,
  HttpCode,
  Post,
  Req,
  Res,
  Body,
  Query,
  BadRequestException,
  UnauthorizedException,
} from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { JwtService } from '@nestjs/jwt';
import { ApiExcludeController } from '@nestjs/swagger';
import { Request, Response } from 'express';
import { JwtSecretService } from 'src/features/auth/jwt-secret.service';
import { OAuthClientService } from './oauth-client.service';
import { OAuthAuthorizationService } from './oauth-authorization.service';
import { OAuthTokenService } from './oauth-token.service';

@ApiExcludeController()
@Controller()
export class OAuthController {
  private readonly publicUrl: string;

  constructor(
    private readonly configService: ConfigService,
    private readonly jwtService: JwtService,
    private readonly jwtSecret: JwtSecretService,
    private readonly clientService: OAuthClientService,
    private readonly authorizationService: OAuthAuthorizationService,
    private readonly tokenService: OAuthTokenService,
  ) {
    this.publicUrl =
      this.configService.get<string>('PUBLIC_URL') || 'http://localhost:8080';
  }

  @Get('.well-known/oauth-authorization-server')
  getAuthorizationServerMetadata() {
    return {
      issuer: this.publicUrl,
      authorization_endpoint: `${this.publicUrl}/oauth/authorize`,
      token_endpoint: `${this.publicUrl}/oauth/token`,
      registration_endpoint: `${this.publicUrl}/oauth/register`,
      response_types_supported: ['code'],
      grant_types_supported: ['authorization_code', 'refresh_token'],
      code_challenge_methods_supported: ['S256'],
      token_endpoint_auth_methods_supported: ['client_secret_post'],
      revocation_endpoint: `${this.publicUrl}/oauth/revoke`,
      revocation_endpoint_auth_methods_supported: ['client_secret_post'],
    };
  }

  @Get('.well-known/oauth-protected-resource')
  getProtectedResourceMetadata() {
    return {
      resource: this.publicUrl,
      authorization_servers: [this.publicUrl],
      bearer_methods_supported: ['header'],
    };
  }

  @Post('oauth/register')
  async registerClient(
    @Body()
    body: {
      client_name: string;
      redirect_uris: string[];
      grant_types?: string[];
    },
  ) {
    if (!body.client_name) {
      throw new BadRequestException('client_name is required');
    }
    if (!body.redirect_uris || body.redirect_uris.length === 0) {
      throw new BadRequestException('redirect_uris is required');
    }

    const result = await this.clientService.registerClient({
      clientName: body.client_name,
      redirectUris: body.redirect_uris,
      grantTypes: body.grant_types,
    });

    return {
      client_id: result.clientId,
      client_secret: result.clientSecret,
      client_name: result.clientName,
      redirect_uris: body.redirect_uris,
      grant_types: body.grant_types ?? ['authorization_code', 'refresh_token'],
    };
  }

  @Get('oauth/authorize')
  async handleAuthorizeGet(
    @Query('client_id') clientId: string,
    @Query('redirect_uri') redirectUri: string,
    @Query('code_challenge') codeChallenge: string,
    @Query('code_challenge_method') codeChallengeMethod: string,
    @Query('response_type') responseType: string,
    @Query('state') state: string,
    @Res() res: Response,
  ) {
    if (!clientId || !redirectUri || !codeChallenge || !state) {
      throw new BadRequestException('Missing required parameters');
    }

    if (!responseType || responseType !== 'code') {
      throw new BadRequestException(
        'response_type is required and must be "code"',
      );
    }

    if (!codeChallengeMethod || codeChallengeMethod !== 'S256') {
      throw new BadRequestException(
        'code_challenge_method is required and must be "S256"',
      );
    }

    const client = await this.clientService.findClient(clientId);
    if (!client) {
      throw new BadRequestException('Unknown client_id');
    }

    if (!client.redirectUris.includes(redirectUri)) {
      throw new BadRequestException('Invalid redirect_uri');
    }

    const params = new URLSearchParams({
      client_id: clientId,
      client_name: client.clientName,
      redirect_uri: redirectUri,
      code_challenge: codeChallenge,
      state,
    });

    res.redirect(302, `${this.publicUrl}/authorize?${params.toString()}`);
  }

  @Post('oauth/authorize')
  async handleAuthorize(
    @Req() req: Request,
    @Body()
    body: {
      client_id: string;
      redirect_uri: string;
      code_challenge: string;
      state: string;
    },
  ) {
    const { client_id, redirect_uri, code_challenge, state } = body;

    if (!client_id || !redirect_uri || !code_challenge || !state) {
      throw new BadRequestException('Missing required fields');
    }

    const client = await this.clientService.findClient(client_id);
    if (!client) {
      throw new BadRequestException('Unknown client_id');
    }

    if (!client.redirectUris.includes(redirect_uri)) {
      throw new BadRequestException('Invalid redirect_uri');
    }

    const userId = this.extractUserIdFromBearer(req);

    const code = await this.authorizationService.createAuthorizationCode({
      clientId: client_id,
      userId,
      redirectUri: redirect_uri,
      codeChallenge: code_challenge,
    });

    const redirectUrl = new URL(redirect_uri);
    redirectUrl.searchParams.set('code', code);
    redirectUrl.searchParams.set('state', state);

    return {
      redirect_uri: redirectUrl.toString(),
    };
  }

  @Post('oauth/revoke')
  @HttpCode(200)
  async revokeToken(
    @Body()
    body: {
      token: string;
      token_type_hint?: string;
      client_id?: string;
      client_secret?: string;
    },
  ) {
    const { token, token_type_hint, client_id, client_secret } = body;

    if (!token) {
      throw new BadRequestException('token is required');
    }

    if (!client_id || !client_secret) {
      throw new BadRequestException('Client authentication required');
    }

    const validSecret = await this.clientService.validateClientSecret(
      client_id,
      client_secret,
    );
    if (!validSecret) {
      throw new BadRequestException('Invalid client credentials');
    }

    await this.tokenService.revokeToken(token, token_type_hint, client_id);

    return {};
  }

  @Post('oauth/token')
  async exchangeToken(
    @Body()
    body: {
      grant_type: string;
      code?: string;
      client_id?: string;
      client_secret?: string;
      code_verifier?: string;
      redirect_uri?: string;
      refresh_token?: string;
    },
  ) {
    const grantType = body.grant_type;

    if (grantType === 'authorization_code') {
      return this.handleAuthorizationCodeGrant(body);
    }

    if (grantType === 'refresh_token') {
      return this.handleRefreshTokenGrant(body);
    }

    throw new BadRequestException(`Unsupported grant_type: ${grantType}`);
  }

  private async handleAuthorizationCodeGrant(body: {
    code?: string;
    client_id?: string;
    client_secret?: string;
    code_verifier?: string;
    redirect_uri?: string;
  }) {
    const { code, client_id, client_secret, code_verifier, redirect_uri } =
      body;

    if (
      !code ||
      !client_id ||
      !client_secret ||
      !code_verifier ||
      !redirect_uri
    ) {
      throw new BadRequestException(
        'Missing required parameters for authorization_code grant',
      );
    }

    const validSecret = await this.clientService.validateClientSecret(
      client_id,
      client_secret,
    );
    if (!validSecret) {
      throw new BadRequestException('Invalid client credentials');
    }

    const { userId } = await this.authorizationService.exchangeCode({
      code,
      clientId: client_id,
      codeVerifier: code_verifier,
      redirectUri: redirect_uri,
    });

    const tokens = await this.tokenService.createTokens(client_id, userId);

    return {
      access_token: tokens.accessToken,
      token_type: tokens.tokenType,
      expires_in: tokens.expiresIn,
      refresh_token: tokens.refreshToken,
    };
  }

  private async handleRefreshTokenGrant(body: {
    client_id?: string;
    client_secret?: string;
    refresh_token?: string;
  }) {
    const { client_id, client_secret, refresh_token } = body;

    if (!client_id || !client_secret || !refresh_token) {
      throw new BadRequestException(
        'Missing required parameters for refresh_token grant',
      );
    }

    const validSecret = await this.clientService.validateClientSecret(
      client_id,
      client_secret,
    );
    if (!validSecret) {
      throw new BadRequestException('Invalid client credentials');
    }

    const tokens = await this.tokenService.refreshTokens(
      refresh_token,
      client_id,
    );

    return {
      access_token: tokens.accessToken,
      token_type: tokens.tokenType,
      expires_in: tokens.expiresIn,
      refresh_token: tokens.refreshToken,
    };
  }

  private extractUserIdFromBearer(req: Request): string {
    const authHeader = req.headers['authorization'];
    if (!authHeader?.startsWith('Bearer ')) {
      throw new UnauthorizedException('Missing Authorization header');
    }

    const token = authHeader.slice(7);

    try {
      const decoded: { sub?: string } = this.jwtService.verify(token, {
        secret: this.jwtSecret.secret,
      });

      if (!decoded?.sub) {
        throw new UnauthorizedException('Invalid token');
      }

      return decoded.sub;
    } catch {
      throw new UnauthorizedException('Invalid or expired token');
    }
  }
}
