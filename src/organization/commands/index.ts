import {
  AddUserToOrganizationHandler,
  RemoveUserFromOrganizationHandler,
} from 'src/organization/commands/handlers';

export const ORGANIZATIONS_COMMANDS = [
  AddUserToOrganizationHandler,
  RemoveUserFromOrganizationHandler,
];
