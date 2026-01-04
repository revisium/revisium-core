import { BadRequestException } from '@nestjs/common';
import { CommandHandler, ICommandHandler } from '@nestjs/cqrs';
import { AuthService } from 'src/features/auth/auth.service';
import { PrismaService } from 'src/infrastructure/database/prisma.service';
import {
  UpdatePasswordCommand,
  UpdatePasswordCommandReturnType,
} from 'src/features/user/commands/impl';

@CommandHandler(UpdatePasswordCommand)
export class UpdatePasswordHandler
  implements
    ICommandHandler<UpdatePasswordCommand, UpdatePasswordCommandReturnType>
{
  constructor(
    private readonly prisma: PrismaService,
    private readonly authService: AuthService,
  ) {}

  async execute({ data }: UpdatePasswordCommand) {
    if (data.newPassword.length < 8) {
      throw new BadRequestException('Password must be at least 8 characters');
    }

    const user = await this.getUser(data);

    if (!user) {
      throw new BadRequestException('Not found user');
    }

    const hasExistingPassword = Boolean(user.password);
    const isOldPasswordEmpty = !data.oldPassword;

    if (hasExistingPassword) {
      if (isOldPasswordEmpty) {
        throw new BadRequestException('Current password is required');
      }

      if (
        !(await this.authService.comparePassword(
          data.oldPassword,
          user.password,
        ))
      ) {
        throw new BadRequestException('Invalid password');
      }
    } else {
      if (!isOldPasswordEmpty) {
        throw new BadRequestException('Invalid password');
      }
    }

    await this.savePassword(data);

    return true;
  }

  private async savePassword(data: UpdatePasswordCommand['data']) {
    return this.prisma.user.update({
      where: {
        id: data.userId,
      },
      data: { password: await this.authService.hashPassword(data.newPassword) },
    });
  }

  private getUser(data: UpdatePasswordCommand['data']) {
    return this.prisma.user.findUnique({
      where: {
        id: data.userId,
      },
    });
  }
}
