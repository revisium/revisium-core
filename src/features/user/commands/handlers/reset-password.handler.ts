import { BadRequestException } from '@nestjs/common';
import { CommandHandler, ICommandHandler } from '@nestjs/cqrs';
import { AuthService } from 'src/features/auth/auth.service';
import { PrismaService } from 'src/infrastructure/database/prisma.service';
import {
  ResetPasswordCommand,
  ResetPasswordCommandReturnType,
} from 'src/features/user/commands/impl';

@CommandHandler(ResetPasswordCommand)
export class ResetPasswordHandler implements ICommandHandler<
  ResetPasswordCommand,
  ResetPasswordCommandReturnType
> {
  constructor(
    private readonly prisma: PrismaService,
    private readonly authService: AuthService,
  ) {}

  async execute({ data }: ResetPasswordCommand) {
    if (data.newPassword.length < 8) {
      throw new BadRequestException('Password must be at least 8 characters');
    }

    const user = await this.prisma.user.findUnique({
      where: { id: data.userId },
    });

    if (!user) {
      throw new BadRequestException('Not found user');
    }

    await this.prisma.user.update({
      where: { id: data.userId },
      data: {
        password: await this.authService.hashPassword(data.newPassword),
        isEmailConfirmed: true,
      },
    });

    return true;
  }
}
