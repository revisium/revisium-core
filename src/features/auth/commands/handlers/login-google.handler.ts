import { InternalServerErrorException } from '@nestjs/common';
import { CommandBus, CommandHandler, ICommandHandler } from '@nestjs/cqrs';
import { nanoid } from 'nanoid';
import { AuthService } from 'src/features/auth/auth.service';
import {
  CreateUserCommand,
  CreateUserCommandReturnType,
  LoginGoogleCommand,
  LoginGoogleCommandReturnType,
} from 'src/features/auth/commands/impl';
import { UserSystemRoles } from 'src/features/auth/consts';
import { GoogleOauthService } from 'src/features/auth/google-oauth.service';
import { PrismaService } from 'src/infrastructure/database/prisma.service';

@CommandHandler(LoginGoogleCommand)
export class LoginGoogleHandler
  implements ICommandHandler<LoginGoogleCommand, LoginGoogleCommandReturnType>
{
  constructor(
    private readonly commandBus: CommandBus,
    private readonly prisma: PrismaService,
    private readonly googleOauthService: GoogleOauthService,
    private readonly authService: AuthService,
  ) {}

  async execute({ data }: LoginGoogleCommand) {
    const info = await this.googleOauthService.getInfo(
      data.redirectUrl,
      data.code,
    );

    const user =
      (await this.getUser(info.email)) || (await this.createUser(info.email));

    return {
      accessToken: this.authService.login({
        username: user.username,
        email: info.email,
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

  private async createUser(email: string) {
    await this.commandBus.execute<
      CreateUserCommand,
      CreateUserCommandReturnType
    >(
      new CreateUserCommand({
        email,
        password: await this.authService.hashPassword(nanoid()),
        isEmailConfirmed: true,
        roleId: UserSystemRoles.systemUser,
      }),
    );

    const user = await this.getUser(email);

    if (!user) {
      throw new InternalServerErrorException('Invalid user');
    }

    return user;
  }
}
