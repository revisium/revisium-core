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

const systemRoles = Object.values(UserSystemRoles).map((role) =>
  role.toString(),
);

const organizationRoles = Object.values(UserOrganizationRoles).map((role) =>
  role.toString(),
);

const projectRoles = Object.values(UserProjectRoles).map((role) =>
  role.toString(),
);

export const isValidSystemRole = (roleId: string) =>
  systemRoles.includes(roleId);

export const isValidOrganizationRole = (roleId: string) =>
  organizationRoles.includes(roleId);

export const isValidProjectRole = (roleId: string) =>
  projectRoles.includes(roleId);

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
