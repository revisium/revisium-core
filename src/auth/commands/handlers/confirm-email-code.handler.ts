import { CommandHandler, ICommandHandler } from '@nestjs/cqrs';
import { PrismaService } from 'src/database/prisma.service';
import { AuthService } from '../../auth.service';
import {
  ConfirmEmailCodeCommand,
  ConfirmEmailCodeCommandReturnType,
} from '../impl';

@CommandHandler(ConfirmEmailCodeCommand)
export class ConfirmEmailCodeHandler
  implements
    ICommandHandler<ConfirmEmailCodeCommand, ConfirmEmailCodeCommandReturnType>
{
  constructor(
    private readonly prisma: PrismaService,
    private readonly authService: AuthService,
  ) {}

  public async execute({ data }: ConfirmEmailCodeCommand) {
    const user = await this.getUser(data.code);

    if (!user) {
      throw new Error('Not found user');
    }

    if (user.isEmailConfirmed) {
      throw new Error('Email is already confirmed');
    }

    await this.confirmEmail(user.id);

    return {
      accessToken: this.authService.login({
        username: user.username || '',
        email: user.email || '',
        sub: user.id,
      }),
    };
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
