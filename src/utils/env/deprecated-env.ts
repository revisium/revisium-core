import { Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';

const deprecationLogger = new Logger('DeprecatedEnv');
const warnedKeys = new Set<string>();

export function resetDeprecationWarnings(): void {
  warnedKeys.clear();
}

const DEPRECATED_ENV_MAPPING: Record<string, string> = {
  EXPERIMENTAL_CACHE: 'CACHE_ENABLED',
  EXPERIMENTAL_CACHE_L1_MAX_SIZE: 'CACHE_L1_MAX_SIZE',
  EXPERIMENTAL_CACHE_L2_REDIS_URL: 'CACHE_L2_REDIS_URL',
  EXPERIMENTAL_CACHE_REDIS_BUS_HOST: 'CACHE_BUS_HOST',
  EXPERIMENTAL_CACHE_REDIS_BUS_PORT: 'CACHE_BUS_PORT',
  EXPERIMENTAL_CACHE_DEBUG: 'CACHE_DEBUG',
  OAUTH_GOOGLE_SECRET_ID: 'OAUTH_GOOGLE_CLIENT_SECRET',
  OAUTH_GITHUB_SECRET_ID: 'OAUTH_GITHUB_CLIENT_SECRET',
};

function findDeprecatedKey(newKey: string): string | undefined {
  return Object.entries(DEPRECATED_ENV_MAPPING).find(
    ([, v]) => v === newKey,
  )?.[0];
}

function logDeprecationWarning(oldKey: string, newKey: string): void {
  if (warnedKeys.has(oldKey)) {
    return;
  }
  warnedKeys.add(oldKey);
  deprecationLogger.warn(
    `DEPRECATED: ${oldKey} is deprecated and will be removed in v3.0.0. Please use ${newKey} instead.`,
  );
}

export function getEnvWithDeprecation<T = string>(
  configService: ConfigService,
  newKey: string,
): T | undefined {
  const newValue = configService.get<T>(newKey);
  if (newValue !== undefined) {
    return newValue;
  }

  const oldKey = findDeprecatedKey(newKey);
  if (!oldKey) {
    return undefined;
  }

  const oldValue = configService.get<T>(oldKey);
  if (oldValue !== undefined) {
    logDeprecationWarning(oldKey, newKey);
    return oldValue;
  }

  return undefined;
}

export function getEnvWithDeprecationOrThrow<T = string>(
  configService: ConfigService,
  newKey: string,
): T {
  const value = getEnvWithDeprecation<T>(configService, newKey);
  if (value === undefined) {
    throw new Error(`Missing required environment variable: ${newKey}`);
  }
  return value;
}
