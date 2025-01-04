import { BadRequestException } from '@nestjs/common';
import { CommandHandler, ICommandHandler } from '@nestjs/cqrs';
import { isValidOrganizationRole } from 'src/features/auth/consts';
import { IdService } from 'src/infrastructure/database/id.service';
import { PrismaService } from 'src/infrastructure/database/prisma.service';
import {
  AddUserToOrganizationCommand,
  AddUserToOrganizationCommandReturnType,
} from 'src/features/organization/commands/impl';

@CommandHandler(AddUserToOrganizationCommand)
export class AddUserToOrganizationHandler
  implements
    ICommandHandler<
      AddUserToOrganizationCommand,
      AddUserToOrganizationCommandReturnType
    >
{
  constructor(
    private readonly prisma: PrismaService,
    private readonly idService: IdService,
  ) {}

  public async execute({ data }: AddUserToOrganizationCommand) {
    if (!isValidOrganizationRole(data.roleId)) {
      throw new BadRequestException('Invalid OrganizationRole');
    }

    const userOrganizationId = await this.getUserOrganizationId(data);

    await this.upsertUserOrganization(data, userOrganizationId);

    return true;
  }

  private upsertUserOrganization(
    data: AddUserToOrganizationCommand['data'],
    userOrganizationId: string,
  ) {
    return this.prisma.userOrganization.upsert({
      where: {
        id: userOrganizationId,
      },
      create: {
        id: userOrganizationId,
        userId: data.userId,
        organizationId: data.organizationId,
        roleId: data.roleId,
      },
      update: {
        roleId: data.roleId,
      },
    });
  }

  private async getUserOrganizationId(
    data: AddUserToOrganizationCommand['data'],
  ) {
    const result = await this.prisma.userOrganization.findFirst({
      where: {
        userId: data.userId,
        organizationId: data.organizationId,
      },
      select: {
        id: true,
      },
    });

    return result?.id || this.idService.generate();
  }
}
