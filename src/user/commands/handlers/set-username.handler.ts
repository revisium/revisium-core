import { CommandHandler, ICommandHandler } from '@nestjs/cqrs';
import { UserRole } from 'src/auth/consts';
import { IdService } from 'src/database/id.service';
import { PrismaService } from 'src/database/prisma.service';
import {
  SetUsernameCommand,
  SetUsernameCommandReturnType,
} from 'src/user/commands/impl';

@CommandHandler(SetUsernameCommand)
export class SetUsernameHandler
  implements ICommandHandler<SetUsernameCommand, SetUsernameCommandReturnType>
{
  constructor(
    private readonly prisma: PrismaService,
    private idService: IdService,
  ) {}

  async execute({ data }: SetUsernameCommand) {
    if (data.username.length < 3) {
      throw new Error('Password must be at least 3 characters');
    }

    const user = await this.getUser(data);

    if (user.username) {
      throw new Error('Username already exists');
    }

    if (await this.existTheSameUsername(data)) {
      throw new Error('The same username already exists');
    }

    if (await this.existTheSameOrganization(data)) {
      throw new Error('The same organization already exists');
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
    const result = await this.prisma.user.findUnique({
      where: {
        username: data.username,
      },
      select: {
        id: true,
      },
    });

    return Boolean(result);
  }

  private async existTheSameOrganization(data: SetUsernameCommand['data']) {
    const result = await this.prisma.organization.findUnique({
      where: {
        id: data.username,
      },
      select: {
        id: true,
      },
    });

    return Boolean(result);
  }
}
