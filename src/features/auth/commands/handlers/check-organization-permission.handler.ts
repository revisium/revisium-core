import { ForbiddenError } from '@casl/ability';
import { CommandHandler, ICommandHandler } from '@nestjs/cqrs';
import { CaslAbilityFactory } from 'src/features/auth/casl-ability.factory';
import { CheckOrganizationPermissionCommand } from 'src/features/auth/commands/impl/check-organization-permission.command';
import { UserRole } from 'src/features/auth/consts';
import { getUserRole } from 'src/features/auth/utils';
import { PrismaService } from 'src/infrastructure/database/prisma.service';

@CommandHandler(CheckOrganizationPermissionCommand)
export class CheckOrganizationPermissionHandler
  implements ICommandHandler<CheckOrganizationPermissionCommand, true>
{
  constructor(
    private readonly prisma: PrismaService,
    private readonly casl: CaslAbilityFactory,
  ) {}

  async execute({ data }: CheckOrganizationPermissionCommand): Promise<true> {
    const systemRole = await this.getSystemRole(data);
    const organizationRole = await this.getOrganizationRole(data);

    const ability = await this.casl.createAbility(systemRole, organizationRole);

    for (const permission of data.permissions) {
      ForbiddenError.from(ability)
        .setMessage(
          `You are not allowed to ${permission.action} on ${permission.subject}`,
        )
        .throwUnlessCan(permission.action, permission.subject);
    }

    return true;
  }

  private async getOrganizationRole(
    data: CheckOrganizationPermissionCommand['data'],
  ): Promise<UserRole> {
    if (data.userId) {
      const result = await this.prisma.userOrganization.findFirst({
        where: { organizationId: data.organizationId, userId: data.userId },
        select: {
          roleId: true,
        },
      });

      return getUserRole(result?.roleId);
    }

    return UserRole.guest;
  }

  private async getSystemRole(
    data: CheckOrganizationPermissionCommand['data'],
  ): Promise<UserRole> {
    if (data.userId) {
      const result = await this.prisma.user.findUnique({
        where: { id: data.userId },
        select: {
          roleId: true,
        },
      });

      return getUserRole(result?.roleId);
    }

    return UserRole.guest;
  }
}
