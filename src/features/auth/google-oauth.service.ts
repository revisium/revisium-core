import { Injectable, InternalServerErrorException } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { JwtService } from '@nestjs/jwt';
import { getEnvWithDeprecation } from 'src/utils/env';

@Injectable()
export class GoogleOauthService {
  public readonly clientId: string | undefined;
  private readonly clientSecret: string | undefined;

  constructor(
    private readonly configService: ConfigService,
    private readonly jwtService: JwtService,
  ) {
    this.clientId = this.configService.get<string>('OAUTH_GOOGLE_CLIENT_ID');
    this.clientSecret = getEnvWithDeprecation(
      this.configService,
      'OAUTH_GOOGLE_CLIENT_SECRET',
    );
  }

  public get isAvailable(): boolean {
    return Boolean(this.clientId && this.clientSecret);
  }

  async getInfo(
    redirectUrl: string,
    authCode: string,
  ): Promise<{ email: string }> {
    if (!this.clientId) {
      throw new InternalServerErrorException('Client ID is missing');
    }

    if (!this.clientSecret) {
      throw new InternalServerErrorException('Client Secret is missing');
    }

    const params = new URLSearchParams({
      code: authCode,
      client_id: this.clientId,
      client_secret: this.clientSecret,
      redirect_uri: redirectUrl,
      grant_type: 'authorization_code',
    });

    const response = await fetch('https://oauth2.googleapis.com/token', {
      method: 'POST',
      headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
      body: params.toString(),
    });

    const { email } = this.jwtService.decode((await response.json()).id_token);

    return {
      email,
    };
  }
}
