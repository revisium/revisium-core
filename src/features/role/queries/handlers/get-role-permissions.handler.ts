import { IQueryHandler, QueryHandler } from '@nestjs/cqrs';
import { PrismaService } from 'src/infrastructure/database/prisma.service';
import {
  GetRolePermissionsQuery,
  GetRolePermissionsQueryReturnType,
} from 'src/features/role/queries/impl/get-role-permissions.query';

@QueryHandler(GetRolePermissionsQuery)
export class GetRolePermissionsHandler
  implements
    IQueryHandler<GetRolePermissionsQuery, GetRolePermissionsQueryReturnType>
{
  constructor(private readonly prisma: PrismaService) {}

  public async execute({ data }: GetRolePermissionsQuery) {
    const role = await this.prisma.role.findUniqueOrThrow({
      where: {
        id: data.roleId,
      },
      include: {
        permissions: true,
      },
    });

    return role.permissions;
  }
}
