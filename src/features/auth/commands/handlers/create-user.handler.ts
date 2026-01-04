import { BadRequestException } from '@nestjs/common';
import { CommandHandler, ICommandHandler } from '@nestjs/cqrs';
import { AuthService } from 'src/features/auth/auth.service';
import {
  CreateUserCommand,
  CreateUserCommandReturnType,
} from 'src/features/auth/commands/impl';
import { isValidSystemRole, UserRole } from 'src/features/auth/consts';
import { validateUrlLikeId } from 'src/features/share/utils/validateUrlLikeId/validateUrlLikeId';
import { IdService } from 'src/infrastructure/database/id.service';
import { PrismaService } from 'src/infrastructure/database/prisma.service';
import { Prisma } from 'src/__generated__/client';

@CommandHandler(CreateUserCommand)
export class CreateUserHandler
  implements ICommandHandler<CreateUserCommand, CreateUserCommandReturnType>
{
  constructor(
    private readonly prisma: PrismaService,
    private readonly idService: IdService,
    private readonly authService: AuthService,
  ) {}

  async execute({ data }: CreateUserCommand) {
    if (data.username) {
      validateUrlLikeId(data.username);
    }

    if (!isValidSystemRole(data.roleId)) {
      throw new BadRequestException('Invalid SystemRole');
    }

    if (data.password && data.password.length < 8) {
      throw new BadRequestException('Password must be at least 8 characters');
    }

    const user = await this.getUser(data);

    if (user) {
      throw new BadRequestException('User already exists');
    }

    if (data.username && (await this.existOrganization(data.username))) {
      throw new BadRequestException(
        `Organization with name=${data.username} already exists`,
      );
    }

    return this.createUserWithOwnOrganization(data);
  }

  private async createUserWithOwnOrganization(data: CreateUserCommand['data']) {
    const userId = this.idService.generate();

    const userCreateInput: Prisma.UserCreateInput = {
      id: userId,
      username: data.username,
      email: data.email,
      isEmailConfirmed: data.isEmailConfirmed,
      emailCode: data.emailCode,
      role: {
        connect: {
          id: data.roleId,
        },
      },
      password: await this.authService.hashPassword(data.password),
    };

    if (data.username) {
      userCreateInput.userOrganizations = {
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
      };
    }

    await this.prisma.user.create({
      data: userCreateInput,
    });

    return userId;
  }

  private async existOrganization(organizationId: string) {
    const result = await this.prisma.organization.findUnique({
      where: { id: organizationId },
      select: {
        id: true,
      },
    });

    return Boolean(result);
  }

  private getUser(data: CreateUserCommand['data']) {
    return this.prisma.user.findFirst({
      where: {
        OR: [{ email: data.email }, { username: data.username }],
      },
    });
  }
}
