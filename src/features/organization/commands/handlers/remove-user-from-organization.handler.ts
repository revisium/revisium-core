import { BadRequestException } from '@nestjs/common';
import { CommandHandler, ICommandHandler } from '@nestjs/cqrs';
import { UserOrganizationRoles } from 'src/features/auth/consts';
import { PrismaService } from 'src/infrastructure/database/prisma.service';
import {
  RemoveUserFromOrganizationCommand,
  RemoveUserFromOrganizationCommandReturnType,
} from 'src/features/organization/commands/impl';

@CommandHandler(RemoveUserFromOrganizationCommand)
export class RemoveUserFromOrganizationHandler
  implements
    ICommandHandler<
      RemoveUserFromOrganizationCommand,
      RemoveUserFromOrganizationCommandReturnType
    >
{
  constructor(private readonly prisma: PrismaService) {}

  public async execute({ data }: RemoveUserFromOrganizationCommand) {
    const userOrganization = await this.getUserOrganization(data);

    if (!userOrganization) {
      throw new BadRequestException('Not found user in organization');
    }

    const isOwner =
      userOrganization.roleId === UserOrganizationRoles.organizationOwner;

    if (
      isOwner &&
      (await this.countOwnerInOrganization(data.organizationId)) === 1
    ) {
      throw new BadRequestException(
        'You cannot remove the last owner of organization',
      );
    }

    await this.removeUserOrganization(userOrganization.id);

    return true;
  }

  private removeUserOrganization(userOrganizationId: string) {
    return this.prisma.userOrganization.delete({
      where: {
        id: userOrganizationId,
      },
    });
  }

  private async getUserOrganization(
    data: RemoveUserFromOrganizationCommand['data'],
  ) {
    return this.prisma.userOrganization.findFirst({
      where: {
        userId: data.userId,
        organizationId: data.organizationId,
      },
      select: {
        id: true,
        roleId: true,
      },
    });
  }

  private async countOwnerInOrganization(organizationId: string) {
    return this.prisma.userOrganization.count({
      where: {
        organizationId,
        roleId: UserOrganizationRoles.organizationOwner,
      },
    });
  }
}
