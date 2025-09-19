export const AUTH_CACHE_KEYS = {
  ROLE_PERMISSIONS: (role: string) => `auth:role:permissions:${role}`,

  CHECK_SYSTEM_PERMISSION: 'auth:check-system-permission',
  CHECK_ORGANIZATION_PERMISSION: 'auth:check-organization-permission',
  CHECK_PROJECT_PERMISSION: 'auth:check-project-permission',
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

  KEY_VERSION: 1 as const,
} as const;
