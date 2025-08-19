import { Injectable, InternalServerErrorException } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { JwtService } from '@nestjs/jwt';

@Injectable()
export class GoogleOauthService {
  public readonly clientId: string | undefined;
  private readonly secretId: string | undefined;

  constructor(
    private readonly configService: ConfigService,
    private readonly jwtService: JwtService,
  ) {
    this.clientId = this.configService.get<string>('OAUTH_GOOGLE_CLIENT_ID');
    this.secretId = this.configService.get<string>('OAUTH_GOOGLE_SECRET_ID');
  }

  public get isAvailable(): boolean {
    return Boolean(this.clientId && this.secretId);
  }

  async getInfo(
    redirectUrl: string,
    authCode: string,
  ): Promise<{ email: string }> {
    if (!this.clientId) {
      throw new InternalServerErrorException('Client ID is missing');
    }

    if (!this.secretId) {
      throw new InternalServerErrorException('Secret ID is missing');
    }

    const params = new URLSearchParams({
      code: authCode,
      client_id: this.clientId,
      client_secret: this.secretId,
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
