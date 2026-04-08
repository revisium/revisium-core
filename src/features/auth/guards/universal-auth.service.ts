import { Injectable, UnauthorizedException } from '@nestjs/common';
import { ApiKeyType } from 'src/__generated__/client';
import { ApiKeyTrackingService } from 'src/features/api-key/api-key-tracking.service';
import { ApiKeyService } from 'src/features/api-key/api-key.service';
import { NoAuthService } from 'src/features/auth/no-auth.service';
import { IApiKeyScope, IAuthUser, ICaslRule } from 'src/features/auth/types';
import { PrismaService } from 'src/infrastructure/database/prisma.service';

@Injectable()
export class UniversalAuthService {
  constructor(
    private readonly apiKeyService: ApiKeyService,
    private readonly apiKeyTracking: ApiKeyTrackingService,
    private readonly noAuth: NoAuthService,
    private readonly prisma: PrismaService,
  ) {}

  authenticateRequest(request: {
    headers: Record<string, string | string[] | undefined>;
    query: Record<string, string | undefined>;
    ip: string;
    user?: IAuthUser;
  }): Promise<'authenticated' | 'jwt' | 'anonymous'> {
    if (this.noAuth.enabled) {
      request.user = this.noAuth.adminUser;
      return Promise.resolve('authenticated');
    }

    return this.authenticate(request.headers, request.query, request.ip).then(
      (user) => {
        if (user) {
          request.user = user;
          return 'authenticated' as const;
        }

        if (request.headers['authorization']) {
          return 'jwt' as const;
        }

        return 'anonymous' as const;
      },
    );
  }

  async authenticate(
    headers: Record<string, string | string[] | undefined>,
    query: Record<string, string | undefined>,
    ip: string,
  ): Promise<IAuthUser | null> {
    const internalKey = this.getHeader(headers, 'x-internal-api-key');
    if (internalKey) {
      return this.validateApiKeyToken(internalKey, 'internal', ip);
    }

    const apiKey = this.getHeader(headers, 'x-api-key');
    if (apiKey) {
      return this.validateApiKeyToken(apiKey, 'external', ip);
    }

    const authHeader = this.getHeader(headers, 'authorization');
    if (authHeader) {
      const bearer = this.extractBearer(authHeader);
      if (!bearer) {
        return null;
      }
      if (bearer.startsWith('rev_')) {
        return this.validateApiKeyToken(bearer, 'external', ip);
      }
      return null;
    }

    const queryKey = query?.api_key;
    if (typeof queryKey === 'string' && queryKey) {
      return this.validateApiKeyToken(queryKey, 'external', ip);
    }

    return null;
  }

  private async validateApiKeyToken(
    rawKey: string,
    source: 'internal' | 'external',
    ip: string,
  ): Promise<IAuthUser> {
    if (!this.apiKeyService.validateKeyFormat(rawKey)) {
      throw new UnauthorizedException('Invalid API key format');
    }

    const keyHash = this.apiKeyService.hashKey(rawKey);
    const apiKey = await this.apiKeyService.findByHash(keyHash);

    if (!apiKey) {
      throw new UnauthorizedException('Invalid API key');
    }

    if (source === 'internal' && apiKey.type !== ApiKeyType.INTERNAL) {
      throw new UnauthorizedException(
        'Internal keys must use X-Internal-Api-Key header',
      );
    }

    if (source === 'external' && apiKey.type === ApiKeyType.INTERNAL) {
      throw new UnauthorizedException(
        'Internal keys must use X-Internal-Api-Key header',
      );
    }

    if (apiKey.revokedAt) {
      throw new UnauthorizedException('API key has been revoked');
    }

    if (apiKey.expiresAt && apiKey.expiresAt < new Date()) {
      throw new UnauthorizedException('API key has expired');
    }

    const scope: IApiKeyScope = {
      organizationId: apiKey.organizationId,
      projectIds: apiKey.projectIds,
      branchNames: apiKey.branchNames,
      tableIds: apiKey.tableIds,
    };

    let user: IAuthUser;
    if (apiKey.type === ApiKeyType.PERSONAL) {
      user = await this.buildPersonalKeyUser(apiKey, scope);
    } else if (apiKey.type === ApiKeyType.SERVICE) {
      user = this.buildServiceKeyUser(apiKey, scope);
    } else {
      user = this.buildInternalKeyUser(apiKey);
    }

    this.apiKeyTracking.track(apiKey.id, ip);
    return user;
  }

  private async buildPersonalKeyUser(
    apiKey: { id: string; userId: string | null },
    scope: IApiKeyScope,
  ): Promise<IAuthUser> {
    if (!apiKey.userId) {
      throw new UnauthorizedException('API key has no associated user');
    }

    const user = await this.prisma.user.findUnique({
      where: { id: apiKey.userId },
      select: { id: true, email: true },
    });

    if (!user) {
      throw new UnauthorizedException('User not found');
    }

    return {
      userId: user.id,
      email: user.email || '',
      authMethod: 'personal_key',
      apiKeyId: apiKey.id,
      apiKeyScope: scope,
    };
  }

  private buildServiceKeyUser(
    apiKey: {
      id: string;
      serviceId: string | null;
      permissions: unknown;
      organizationId: string | null;
    },
    scope: IApiKeyScope,
  ): IAuthUser {
    const permissions = apiKey.permissions as
      | { rules: ICaslRule[] }
      | null
      | undefined;

    return {
      userId: apiKey.serviceId || apiKey.id,
      email: '',
      authMethod: 'service_key',
      apiKeyId: apiKey.id,
      serviceId: apiKey.serviceId || undefined,
      apiKeyScope: scope,
      serviceKeyPermissions: permissions || undefined,
    };
  }

  private buildInternalKeyUser(apiKey: {
    id: string;
    internalServiceName: string | null;
  }): IAuthUser {
    return {
      userId: `internal:${apiKey.internalServiceName || 'unknown'}`,
      email: '',
      authMethod: 'internal_key',
      apiKeyId: apiKey.id,
    };
  }

  private getHeader(
    headers: Record<string, string | string[] | undefined>,
    name: string,
  ): string | undefined {
    const value = headers[name];
    if (Array.isArray(value)) {
      return value[0];
    }
    return value;
  }

  private extractBearer(authHeader: string): string | undefined {
    if (authHeader.startsWith('Bearer ')) {
      return authHeader.slice(7);
    }
    return undefined;
  }
}
