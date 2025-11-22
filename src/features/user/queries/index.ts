import {
  GetProjectsByUserIdHandler,
  GetUserHandler,
  DeprecatedGetOwnedUserOrganizationHandler,
  GetUserProjectHandler,
  SearchUsersHandler,
  GetUserOrganizationHandler,
} from 'src/features/user/queries/handlers';

export const USER_QUERIES = [
  GetUserHandler,
  DeprecatedGetOwnedUserOrganizationHandler,
  GetUserProjectHandler,
  GetProjectsByUserIdHandler,
  SearchUsersHandler,
  GetUserOrganizationHandler,
];
