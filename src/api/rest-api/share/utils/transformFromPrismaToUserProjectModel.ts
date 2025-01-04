import { GetUsersProjectQueryReturnType } from 'src/features/project/queries/impl';
import { UsersProjectModel } from 'src/api/rest-api/project/model';
import { IPaginatedType } from 'src/features/share/pagination.interface';

export const transformFromPrismaToUserProjectModel = (
  data: GetUsersProjectQueryReturnType['edges'][number]['node'],
): UsersProjectModel => {
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

export const transformFromPaginatedPrismaToUserProjectModel = ({
  pageInfo,
  totalCount,
  edges,
}: GetUsersProjectQueryReturnType): IPaginatedType<UsersProjectModel> => {
  return {
    pageInfo,
    totalCount,
    edges: edges.map((edge) => ({
      cursor: edge.cursor,
      node: transformFromPrismaToUserProjectModel(edge.node),
    })),
  };
};
