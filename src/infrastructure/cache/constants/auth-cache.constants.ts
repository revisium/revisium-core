export const AUTH_CACHE_KEYS = {
  ROLE_PERMISSIONS: (role: string) => `auth:role:permissions:${role}`,

  CHECK_SYSTEM_PERMISSION: 'auth:check-system-permission',
  CHECK_ORGANIZATION_PERMISSION: 'auth:check-organization-permission',
  CHECK_PROJECT_PERMISSION: 'auth:check-project-permission',

  PROJECT_IDENTITY: 'auth:project-identity',

  API_KEY_BY_HASH: (keyHash: string) => `auth:api-key:${keyHash}`,

  USER_TOKEN_VERSION: (userId: string) => `auth:token-version:${userId}`,
} as const;

export const AUTH_CACHE_TAGS = {
  DICTIONARIES: 'dictionaries',

  USER_PERMISSIONS: (userId: string) => `user-permissions-${userId}`,

  ORGANIZATION_PERMISSIONS: (organizationId: string) =>
    `org-permissions-${organizationId}`,

  PROJECT_PERMISSIONS: (organizationId: string, projectName: string) =>
    `project-permissions-${organizationId}-${projectName}`,

  AUTH_RELATIVES: 'auth-relatives',
} as const;

export const AUTH_CACHE_CONFIG = {
  ROLE_PERMISSIONS_TTL: '1d' as const,

  PERMISSION_CHECK_TTL: '10m' as const,

  // Project identity (revisionId/endpointId/projectId → org/name) is a
  // stable mapping for the project's lifetime, so cache it long. It is
  // tagged with PROJECT_PERMISSIONS so visibility/membership changes
  // invalidate it together with the permission check entries.
  PROJECT_IDENTITY_TTL: '1d' as const,

  API_KEY_TTL: '5m' as const,

  // Short TTL so a tokenVersion bump (the "kick every session for this
  // user" hammer) propagates within seconds across all pods. Users
  // actively using the app will refresh via the access-JWT path within
  // a few requests; the absolute ceiling is this TTL.
  TOKEN_VERSION_TTL: '30s' as const,

  KEY_VERSION: 1 as const,
} as const;
