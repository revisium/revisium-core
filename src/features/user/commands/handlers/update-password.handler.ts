import { BadRequestException } from '@nestjs/common';
import { CommandHandler, ICommandHandler } from '@nestjs/cqrs';
import { AuthService } from 'src/features/auth/auth.service';
import { PrismaService } from 'src/infrastructure/database/prisma.service';
import {
  UpdatePasswordCommand,
  UpdatePasswordCommandReturnType,
} from 'src/features/user/commands/impl';

@CommandHandler(UpdatePasswordCommand)
export class UpdatePasswordHandler implements ICommandHandler<
  UpdatePasswordCommand,
  UpdatePasswordCommandReturnType
> {
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

    await this.validateOldPassword(user.password, data.oldPassword);
    await this.savePassword(data);

    return true;
  }

  private async validateOldPassword(
    existingPassword: string,
    oldPassword: string,
  ): Promise<void> {
    const hasExistingPassword = Boolean(existingPassword);
    const hasOldPassword = Boolean(oldPassword);

    if (hasExistingPassword && !hasOldPassword) {
      throw new BadRequestException('Current password is required');
    }

    if (!hasExistingPassword && hasOldPassword) {
      throw new BadRequestException('Invalid password');
    }

    if (
      hasExistingPassword &&
      !(await this.authService.comparePassword(oldPassword, existingPassword))
    ) {
      throw new BadRequestException('Invalid password');
    }
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
