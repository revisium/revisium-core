import { IQueryHandler, QueryHandler } from '@nestjs/cqrs';
import { UserOrganizationRoles } from 'src/features/auth/consts';
import { PrismaService } from 'src/infrastructure/database/prisma.service';
import {
  DeprecatedGetOwnedUserOrganizationQuery,
  DeprecatedGetOwnedUserOrganizationQueryReturnType,
} from 'src/features/user/queries/impl/deprecated-get-owned-user-organization.query';

@QueryHandler(DeprecatedGetOwnedUserOrganizationQuery)
export class DeprecatedGetOwnedUserOrganizationHandler
  implements
    IQueryHandler<
      DeprecatedGetOwnedUserOrganizationQuery,
      DeprecatedGetOwnedUserOrganizationQueryReturnType
    >
{
  constructor(private readonly prisma: PrismaService) {}

  public async execute({ data }: DeprecatedGetOwnedUserOrganizationQuery) {
    return this.prisma.userOrganization.findFirst({
      where: {
        userId: data.userId,
        roleId: UserOrganizationRoles.organizationOwner,
      },
    });
  }
}
