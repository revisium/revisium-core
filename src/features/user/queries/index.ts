import {
  GetProjectsByUserIdHandler,
  GetUserHandler,
  DeprecatedGetOwnedUserOrganizationHandler,
  GetUserProjectHandler,
  SearchUsersHandler,
} from 'src/features/user/queries/handlers';

export const USER_QUERIES = [
  GetUserHandler,
  DeprecatedGetOwnedUserOrganizationHandler,
  DeprecatedGetOwnedUserOrganizationHandler,
  GetUserProjectHandler,
  GetProjectsByUserIdHandler,
  SearchUsersHandler,
];
