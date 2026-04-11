import { UnauthorizedException } from '@nestjs/common';
import { CommandHandler, ICommandHandler } from '@nestjs/cqrs';
import { PrismaService } from 'src/infrastructure/database/prisma.service';
import { AuthService } from 'src/features/auth/auth.service';
import {
  ConfirmEmailCodeCommand,
  ConfirmEmailCodeCommandReturnType,
} from 'src/features/auth/commands/impl';

@CommandHandler(ConfirmEmailCodeCommand)
export class ConfirmEmailCodeHandler implements ICommandHandler<
  ConfirmEmailCodeCommand,
  ConfirmEmailCodeCommandReturnType
> {
  constructor(
    private readonly prisma: PrismaService,
    private readonly authService: AuthService,
  ) {}

  public async execute({ data }: ConfirmEmailCodeCommand) {
    const user = await this.getUser(data.code);

    if (!user) {
      throw new UnauthorizedException('Not found user');
    }

    if (user.isEmailConfirmed) {
      throw new UnauthorizedException('Email is already confirmed');
    }

    const updated = await this.confirmEmail(user.id);

    return this.authService.issueTokens(updated, {
      ip: data.ip,
      userAgent: data.userAgent,
    });
  }

  private confirmEmail(userId: string) {
    return this.prisma.user.update({
      where: { id: userId },
      data: {
        isEmailConfirmed: true,
        emailCode: '',
      },
    });
  }

  private getUser(emailCode: string) {
    return this.prisma.user.findFirst({
      where: {
        emailCode,
      },
    });
  }
}
