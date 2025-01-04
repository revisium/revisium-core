import { UnauthorizedException } from '@nestjs/common';
import { CommandHandler, ICommandHandler } from '@nestjs/cqrs';
import { AuthService } from 'src/features/auth/auth.service';
import { LoginCommand, LoginCommandReturnType } from 'src/features/auth/commands/impl';
import { PrismaService } from 'src/infrastructure/database/prisma.service';

@CommandHandler(LoginCommand)
export class LoginHandler
  implements ICommandHandler<LoginCommand, LoginCommandReturnType>
{
  constructor(
    private readonly prisma: PrismaService,
    private readonly authService: AuthService,
  ) {}

  async execute({ data }: LoginCommand): Promise<LoginCommandReturnType> {
    const user = await this.getUser(data.emailOrUsername);

    if (!user) {
      throw new UnauthorizedException('User does not exist');
    }

    if (
      !(await this.authService.comparePassword(data.password, user.password))
    ) {
      throw new UnauthorizedException('Invalid password');
    }

    if (!user.isEmailConfirmed) {
      throw new UnauthorizedException('Email is not confirmed');
    }

    return {
      accessToken: this.authService.login({
        username: user.username || '',
        email: user.email || '',
        sub: user.id,
      }),
    };
  }

  private getUser(emailOrUserName: string) {
    return this.prisma.user.findFirst({
      where: {
        OR: [{ email: emailOrUserName }, { username: emailOrUserName }],
      },
    });
  }
}
