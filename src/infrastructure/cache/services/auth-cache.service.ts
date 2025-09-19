import { Injectable } from '@nestjs/common';
import { CacheService } from './cache.service';
import { makeCacheKeyFromArgs } from 'src/utils/utils/stable-cache-key';
import {
  AUTH_CACHE_KEYS,
  AUTH_CACHE_TAGS,
  AUTH_CACHE_CONFIG,
} from '../constants/auth-cache.constants';

@Injectable()
export class AuthCacheService {
  constructor(private readonly cache: CacheService) {}

  public async rolePermissions<T>(role: string, factory: () => Promise<T>) {
    return this.cache.getOrSet({
      key: AUTH_CACHE_KEYS.ROLE_PERMISSIONS(role),
      ttl: AUTH_CACHE_CONFIG.ROLE_PERMISSIONS_TTL,
      tags: [AUTH_CACHE_TAGS.DICTIONARIES],
      factory,
    });
  }

  public async systemPermissionCheck<T>(
    query: { userId?: string },
    factory: () => Promise<T>,
  ) {
    const keyHash = makeCacheKeyFromArgs([query], {
      prefix: AUTH_CACHE_KEYS.CHECK_SYSTEM_PERMISSION,
      version: AUTH_CACHE_CONFIG.KEY_VERSION,
    });

    const userId = query.userId;

    return this.cache.getOrSet({
      key: keyHash,
      ttl: AUTH_CACHE_CONFIG.PERMISSION_CHECK_TTL,
      tags: [
        AUTH_CACHE_TAGS.AUTH_RELATIVES,
        ...(userId ? [AUTH_CACHE_TAGS.USER_PERMISSIONS(userId)] : []),
      ],
      factory,
    });
  }

  async organizationPermissionCheck<T>(
    query: { organizationId: string; userId?: string },
    factory: () => Promise<T>,
  ) {
    const keyHash = makeCacheKeyFromArgs([query], {
      prefix: AUTH_CACHE_KEYS.CHECK_ORGANIZATION_PERMISSION,
      version: AUTH_CACHE_CONFIG.KEY_VERSION,
    });

    const userId = query.userId;

    return this.cache.getOrSet({
      key: keyHash,
      ttl: AUTH_CACHE_CONFIG.PERMISSION_CHECK_TTL,
      tags: [
        AUTH_CACHE_TAGS.AUTH_RELATIVES,
        AUTH_CACHE_TAGS.ORGANIZATION_PERMISSIONS(query.organizationId),
        ...(userId ? [AUTH_CACHE_TAGS.USER_PERMISSIONS(userId)] : []),
      ],
      factory,
    });
  }

  async projectPermissionCheck<T>(
    query: { organizationId?: string; projectName?: string; userId?: string },
    factory: () => Promise<T>,
  ) {
    const keyHash = makeCacheKeyFromArgs([query], {
      prefix: AUTH_CACHE_KEYS.CHECK_PROJECT_PERMISSION,
      version: AUTH_CACHE_CONFIG.KEY_VERSION,
    });

    const userId = query.userId;
    const organizationId = query.organizationId;
    const projectName = query.projectName;

    return this.cache.getOrSet({
      key: keyHash,
      ttl: AUTH_CACHE_CONFIG.PERMISSION_CHECK_TTL,
      tags: [
        AUTH_CACHE_TAGS.AUTH_RELATIVES,
        ...(userId ? [AUTH_CACHE_TAGS.USER_PERMISSIONS(userId)] : []),
        ...(organizationId
          ? [AUTH_CACHE_TAGS.ORGANIZATION_PERMISSIONS(organizationId)]
          : []),
        ...(organizationId && projectName
          ? [AUTH_CACHE_TAGS.PROJECT_PERMISSIONS(organizationId, projectName)]
          : []),
      ],
      factory,
    });
  }

  public async invalidateUserPermissions(userId: string) {
    await this.cache.deleteByTag({
      tags: [AUTH_CACHE_TAGS.USER_PERMISSIONS(userId)],
    });
  }

  public async invalidateOrganizationPermissions(organizationId: string) {
    await this.cache.deleteByTag({
      tags: [AUTH_CACHE_TAGS.ORGANIZATION_PERMISSIONS(organizationId)],
    });
  }

  public async invalidateProjectPermissions(
    organizationId: string,
    projectName: string,
  ) {
    await this.cache.deleteByTag({
      tags: [AUTH_CACHE_TAGS.PROJECT_PERMISSIONS(organizationId, projectName)],
    });
  }

  public async invalidateAllAuthCaches() {
    await this.cache.deleteByTag({
      tags: [AUTH_CACHE_TAGS.AUTH_RELATIVES],
    });
  }
}
