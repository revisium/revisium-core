import { ForbiddenError } from '@casl/ability';
import { CommandHandler, ICommandHandler } from '@nestjs/cqrs';
import { CaslAbilityFactory } from 'src/features/auth/casl-ability.factory';
import {
  CheckSystemPermissionCommand,
  CheckSystemPermissionCommandReturnType,
} from 'src/features/auth/commands/impl';
import { UserRole } from 'src/features/auth/consts';
import { getUserRole } from 'src/features/auth/utils';
import { PrismaService } from 'src/infrastructure/database/prisma.service';

@CommandHandler(CheckSystemPermissionCommand)
export class CheckSystemPermissionHandler implements ICommandHandler<
  CheckSystemPermissionCommand,
  CheckSystemPermissionCommandReturnType
> {
  constructor(
    private readonly prisma: PrismaService,
    private readonly casl: CaslAbilityFactory,
  ) {}

  async execute({ data }: CheckSystemPermissionCommand) {
    const systemRole = await this.getSystemRole(data);

    const ability = await this.casl.createAbility(systemRole);

    for (const permission of data.permissions) {
      ForbiddenError.from(ability)
        .setMessage(
          `You are not allowed to ${permission.action} on ${permission.subject}`,
        )
        .throwUnlessCan(permission.action, permission.subject);
    }

    return true;
  }

  private async getSystemRole(
    data: CheckSystemPermissionCommand['data'],
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
