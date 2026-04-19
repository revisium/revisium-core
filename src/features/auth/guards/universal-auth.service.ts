import { Injectable, UnauthorizedException } from '@nestjs/common';
import { ApiKeyType } from 'src/__generated__/client';
import { ApiKeyTrackingService } from 'src/features/api-key/api-key-tracking.service';
import { ApiKeyService } from 'src/features/api-key/api-key.service';
import { NoAuthService } from 'src/features/auth/no-auth.service';
import { ACCESS_COOKIE_NAME } from 'src/features/auth/services/cookie.service';
import { IApiKeyScope, IAuthUser, ICaslRule } from 'src/features/auth/types';
import { PrismaService } from 'src/infrastructure/database/prisma.service';

type HeaderMap = Record<string, string | string[] | undefined>;

@Injectable()
export class UniversalAuthService {
  constructor(
    private readonly apiKeyService: ApiKeyService,
    private readonly apiKeyTracking: ApiKeyTrackingService,
    private readonly noAuth: NoAuthService,
    private readonly prisma: PrismaService,
  ) {}

  authenticateRequest(request: {
    headers: HeaderMap;
    query: Record<string, string | undefined>;
    ip: string;
    user?: IAuthUser;
    cookies?: Record<string, string | undefined>;
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

        if (request.cookies?.[ACCESS_COOKIE_NAME]) {
          return 'jwt' as const;
        }

        return 'anonymous' as const;
      },
    );
  }

  async authenticate(
    headers: HeaderMap,
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

    this.assertApiKeySourceMatches(apiKey.type, source);
    this.assertApiKeyActive(apiKey);

    const scope: IApiKeyScope = {
      organizationId: apiKey.organizationId,
      projectIds: apiKey.projectIds,
      branchNames: apiKey.branchNames,
      tableIds: apiKey.tableIds,
    };

    const user = await this.buildUserForApiKey(apiKey, scope);

    this.apiKeyTracking.track(apiKey.id, ip);
    return user;
  }

  private assertApiKeySourceMatches(
    keyType: ApiKeyType,
    source: 'internal' | 'external',
  ): void {
    const isInternalKey = keyType === ApiKeyType.INTERNAL;
    const mismatched =
      (source === 'internal' && !isInternalKey) ||
      (source === 'external' && isInternalKey);
    if (mismatched) {
      throw new UnauthorizedException(
        'Internal keys must use X-Internal-Api-Key header',
      );
    }
  }

  private assertApiKeyActive(apiKey: {
    revokedAt: Date | null;
    expiresAt: Date | null;
  }): void {
    if (apiKey.revokedAt) {
      throw new UnauthorizedException('API key has been revoked');
    }
    if (apiKey.expiresAt && apiKey.expiresAt < new Date()) {
      throw new UnauthorizedException('API key has expired');
    }
  }

  private async buildUserForApiKey(
    apiKey: {
      id: string;
      type: ApiKeyType;
      userId: string | null;
      serviceId: string | null;
      internalServiceName: string | null;
      permissions: unknown;
      organizationId: string | null;
      readOnly: boolean;
    },
    scope: IApiKeyScope,
  ): Promise<IAuthUser> {
    if (apiKey.type === ApiKeyType.PERSONAL) {
      const user = await this.buildPersonalKeyUser(apiKey, scope);
      if (apiKey.readOnly) {
        user.apiKeyReadOnly = true;
      }
      return user;
    }
    if (apiKey.type === ApiKeyType.SERVICE) {
      const user = this.buildServiceKeyUser(apiKey, scope);
      if (apiKey.readOnly) {
        user.apiKeyReadOnly = true;
      }
      return user;
    }
    if (apiKey.type === ApiKeyType.INTERNAL) {
      return this.buildInternalKeyUser(apiKey);
    }
    throw new UnauthorizedException('Unsupported API key type');
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

  private getHeader(headers: HeaderMap, name: string): string | undefined {
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
