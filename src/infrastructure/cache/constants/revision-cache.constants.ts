export const REVISION_CACHE_KEYS = {
  REVISION: (revisionId: string) => `revision:revision:${revisionId}`,
} as const;
export const REVISION_CACHE_TAGS = {
  REVISION: (revisionId: string) => `revision-${revisionId}`,
} as const;
export const REVISION_CACHE_CONFIG = {
  TTL: '1d' as const,
  KEY_VERSION: 1 as const,
} as const;
