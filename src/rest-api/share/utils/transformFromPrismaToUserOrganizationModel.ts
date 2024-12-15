import { GetUsersOrganizationQueryReturnType } from 'src/organization/queries/impl';
import { UsersOrganizationModel } from 'src/rest-api/organization/model';
import { IPaginatedType } from 'src/share/pagination.interface';

export const transformFromPrismaToUserOrganizationModel = (
  data: GetUsersOrganizationQueryReturnType['edges'][number]['node'],
): UsersOrganizationModel => {
  return {
    id: data.id,
    user: {
      id: data.user.id,
      username: data.user.username || undefined,
      email: data.user.email || undefined,
    },
    role: {
      id: data.role.id,
      name: data.role.name,
    },
  };
};

export const transformFromPaginatedPrismaToUserOrganizationModel = ({
  pageInfo,
  totalCount,
  edges,
}: GetUsersOrganizationQueryReturnType): IPaginatedType<UsersOrganizationModel> => {
  return {
    pageInfo,
    totalCount,
    edges: edges.map((edge) => ({
      cursor: edge.cursor,
      node: transformFromPrismaToUserOrganizationModel(edge.node),
    })),
  };
};
