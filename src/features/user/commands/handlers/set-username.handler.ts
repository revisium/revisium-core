import { BadRequestException } from '@nestjs/common';
import { CommandHandler, ICommandHandler } from '@nestjs/cqrs';
import { UserRole } from 'src/features/auth/consts';
import { validateUsername } from 'src/features/share/utils/validateUrlLikeId/validateUsername';
import { IdService } from 'src/infrastructure/database/id.service';
import { PrismaService } from 'src/infrastructure/database/prisma.service';
import {
  SetUsernameCommand,
  SetUsernameCommandReturnType,
} from 'src/features/user/commands/impl';

@CommandHandler(SetUsernameCommand)
export class SetUsernameHandler
  implements ICommandHandler<SetUsernameCommand, SetUsernameCommandReturnType>
{
  constructor(
    private readonly prisma: PrismaService,
    private readonly idService: IdService,
  ) {}

  async execute({ data }: SetUsernameCommand) {
    if (data.username.length < 3) {
      throw new BadRequestException('Username must be at least 3 characters');
    }

    validateUsername(data.username);

    const user = await this.getUser(data);

    if (user.username) {
      throw new BadRequestException('Username already exists');
    }

    if (await this.existTheSameUsername(data)) {
      throw new BadRequestException('The same username already exists');
    }

    if (await this.existTheSameOrganization(data)) {
      throw new BadRequestException('The same organization already exists');
    }

    await this.updateUser(data);

    return true;
  }

  private updateUser(data: SetUsernameCommand['data']) {
    return this.prisma.user.update({
      where: {
        id: data.userId,
      },
      data: {
        username: data.username,
        userOrganizations: {
          create: {
            id: this.idService.generate(),
            organization: {
              create: {
                id: data.username,
                createdId: this.idService.generate(8),
              },
            },
            role: {
              connect: {
                id: UserRole.organizationOwner,
              },
            },
          },
        },
      },
    });
  }

  private getUser(data: SetUsernameCommand['data']) {
    return this.prisma.user.findFirstOrThrow({
      where: {
        id: data.userId,
      },
    });
  }

  private async existTheSameUsername(data: SetUsernameCommand['data']) {
    const result = await this.prisma.user.findFirst({
      where: {
        username: { equals: data.username, mode: 'insensitive' },
      },
      select: {
        id: true,
      },
    });

    return Boolean(result);
  }

  private async existTheSameOrganization(data: SetUsernameCommand['data']) {
    const result = await this.prisma.organization.findFirst({
      where: {
        id: { equals: data.username, mode: 'insensitive' },
      },
      select: {
        id: true,
      },
    });

    return Boolean(result);
  }
}
