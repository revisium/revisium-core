import { Injectable } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';

@Injectable()
export class GitHubAuthService {
  public readonly clientId: string | undefined;
  private readonly secretId: string | undefined;

  constructor(private readonly configService: ConfigService) {
    this.clientId = this.configService.get<string>('OAUTH_GITHUB_CLIENT_ID');
    this.secretId = this.configService.get<string>('OAUTH_GITHUB_SECRET_ID');
  }

  public get isAvailable(): boolean {
    return Boolean(this.clientId && this.secretId);
  }

  public async getEmail(code: string): Promise<string> {
    const token = await this.exchangeCodeForToken(code);
    const userEmail =
      (await this.getUserData(token)) || (await this.getUserEmails(token));

    if (!userEmail) {
      throw new Error('Invalid user email');
    }

    return userEmail;
  }

  private async exchangeCodeForToken(code: string): Promise<string> {
    const url = 'https://github.com/login/oauth/access_token';

    if (!this.clientId) {
      throw new Error('Client ID is missing');
    }

    if (!this.secretId) {
      throw new Error('Secret ID is missing');
    }

    const params = new URLSearchParams({
      client_id: this.clientId,
      client_secret: this.secretId,
      code,
    });

    const response = await fetch(url, {
      method: 'POST',
      headers: {
        Accept: 'application/json',
        'Content-Type': 'application/x-www-form-urlencoded',
      },
      body: params.toString(),
    });

    return (await response.json()).access_token;
  }

  private async getUserData(accessToken: string): Promise<string | undefined> {
    const url = 'https://api.github.com/user';

    const response = await fetch(url, {
      method: 'GET',
      headers: {
        Authorization: `Bearer ${accessToken}`,
        Accept: 'application/json',
      },
    });

    const data: { email?: string } = await response.json();
    return data.email;
  }

  private async getUserEmails(
    accessToken: string,
  ): Promise<string | undefined> {
    const url = 'https://api.github.com/user/emails';

    const response = await fetch(url, {
      method: 'GET',
      headers: {
        Authorization: `Bearer ${accessToken}`,
        Accept: 'application/json',
      },
    });

    const emails: { email: string; primary: boolean }[] = await response.json();
    const primaryEmail = emails.find((email) => email.primary);
    return primaryEmail?.email;
  }
}
