import { IQueryHandler, QueryHandler } from '@nestjs/cqrs';
import { UserOrganizationRoles } from 'src/auth/consts';
import { PrismaService } from 'src/database/prisma.service';
import {
  GetUserOrganizationQuery,
  GetUserOrganizationQueryReturnType,
  GetUserQuery,
} from 'src/user/queries/impl';

@QueryHandler(GetUserOrganizationQuery)
export class GetUserOrganizationHandler
  implements IQueryHandler<GetUserQuery, GetUserOrganizationQueryReturnType>
{
  constructor(private readonly prisma: PrismaService) {}

  public async execute({ data }: GetUserOrganizationQuery) {
    const owner = await this.prisma.userOrganization.findFirst({
      where: {
        userId: data.userId,
        roleId: UserOrganizationRoles.organizationOwner,
      },
      select: {
        organizationId: true,
      },
    });

    return owner?.organizationId;
  }
}