import { Injectable, BadRequestException } from '@nestjs/common';
import { createHash, randomBytes, timingSafeEqual } from 'node:crypto';
import { PrismaService } from 'src/infrastructure/database/prisma.service';

const CLIENT_SECRET_PREFIX = 'ocs_';

@Injectable()
export class OAuthClientService {
  constructor(private readonly prisma: PrismaService) {}

  async registerClient(data: {
    clientName: string;
    redirectUris: string[];
    grantTypes?: string[];
  }): Promise<{ clientId: string; clientSecret: string; clientName: string }> {
    for (const uri of data.redirectUris) {
      this.validateRedirectUri(uri);
    }

    const clientSecret = CLIENT_SECRET_PREFIX + randomBytes(36).toString('hex');
    const clientSecretHash = this.hashSecret(clientSecret);

    const client = await this.prisma.oAuthClient.create({
      data: {
        clientSecretHash,
        clientName: data.clientName,
        redirectUris: data.redirectUris,
        grantTypes: data.grantTypes ?? ['authorization_code', 'refresh_token'],
      },
    });

    return {
      clientId: client.id,
      clientSecret,
      clientName: client.clientName,
    };
  }

  async findClient(clientId: string) {
    return this.prisma.oAuthClient.findUnique({
      where: { id: clientId },
    });
  }

  async validateClientSecret(
    clientId: string,
    secret: string,
  ): Promise<boolean> {
    const client = await this.findClient(clientId);
    if (!client) {
      return false;
    }
    const a = Buffer.from(client.clientSecretHash, 'hex');
    const b = Buffer.from(this.hashSecret(secret), 'hex');
    return a.length === b.length && timingSafeEqual(a, b);
  }

  private validateRedirectUri(uri: string): void {
    let parsed: URL;
    try {
      parsed = new URL(uri);
    } catch {
      throw new BadRequestException(`Invalid redirect_uri: ${uri}`);
    }

    if (parsed.protocol !== 'http:' && parsed.protocol !== 'https:') {
      throw new BadRequestException(
        `redirect_uri must use http or https scheme: ${uri}`,
      );
    }

    if (
      parsed.protocol === 'http:' &&
      parsed.hostname !== 'localhost' &&
      parsed.hostname !== '127.0.0.1' &&
      parsed.hostname !== '[::1]'
    ) {
      throw new BadRequestException(
        `http redirect_uri is only allowed for localhost: ${uri}`,
      );
    }
  }

  private hashSecret(secret: string): string {
    return createHash('sha256').update(secret).digest('hex');
  }
}
