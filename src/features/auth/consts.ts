export enum UserRole {
  systemAdmin = 'systemAdmin',
  systemFullApiRead = 'systemFullApiRead',
  systemUser = 'systemUser',
  organizationOwner = 'organizationOwner',
  organizationAdmin = 'organizationAdmin',
  developer = 'developer',
  editor = 'editor',
  reader = 'reader',
  guest = 'guest',
  user = 'user',
}

export enum UserSystemRoles {
  systemAdmin = 'systemAdmin',
  systemFullApiRead = 'systemFullApiRead',
  systemUser = 'systemUser',
}

export enum UserOrganizationRoles {
  organizationOwner = 'organizationOwner',
  organizationAdmin = 'organizationAdmin',
  developer = 'developer',
  editor = 'editor',
  reader = 'reader',
}

export enum UserProjectRoles {
  developer = 'developer',
  editor = 'editor',
  reader = 'reader',
}

const systemRoles = new Set(
  Object.values(UserSystemRoles).map((role) => role.toString()),
);

const organizationRoles = new Set(
  Object.values(UserOrganizationRoles).map((role) => role.toString()),
);

const projectRoles = new Set(
  Object.values(UserProjectRoles).map((role) => role.toString()),
);

export const isValidSystemRole = (roleId: string) => systemRoles.has(roleId);

export const isValidOrganizationRole = (roleId: string) =>
  organizationRoles.has(roleId);

export const isValidProjectRole = (roleId: string) => projectRoles.has(roleId);

export enum PermissionAction {
  create = 'create',
  delete = 'delete',
  read = 'read',
  revert = 'revert',
  update = 'update',
  add = 'add',
}

export enum PermissionSubject {
  Organization = 'Organization',
  Project = 'Project',
  Branch = 'Branch',
  Revision = 'Revision',
  Table = 'Table',
  Row = 'Row',
  Endpoint = 'Endpoint',
  User = 'User',
}
