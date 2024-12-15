import { UserRole } from 'src/auth/consts';

function isUserRole(roleId: string | undefined): roleId is UserRole {
  return Object.values(UserRole).includes(roleId as UserRole);
}

export function getUserRole(roleId: string | undefined): UserRole {
  if (isUserRole(roleId)) {
    return roleId;
  }

  return UserRole.guest;
}
