import { InternalServerErrorException } from '@nestjs/common';
import { CommandBus, CommandHandler, ICommandHandler } from '@nestjs/cqrs';
import { nanoid } from 'nanoid';
import { AuthService } from 'src/auth/auth.service';
import {
  CreateUserCommand,
  CreateUserCommandReturnType,
  LoginGithubCommand,
  LoginGithubCommandReturnType,
} from 'src/auth/commands/impl';
import { UserSystemRoles } from 'src/auth/consts';
import { GitHubAuthService } from 'src/auth/github-oauth.service';
import { PrismaService } from 'src/database/prisma.service';

@CommandHandler(LoginGithubCommand)
export class LoginGithubHandler
  implements ICommandHandler<LoginGithubCommand, LoginGithubCommandReturnType>
{
  constructor(
    private readonly commandBus: CommandBus,
    private readonly prisma: PrismaService,
    private readonly githubOauthService: GitHubAuthService,
    private readonly authService: AuthService,
  ) {}

  async execute({ data }: LoginGithubCommand) {
    const email = await this.githubOauthService.getEmail(data.code);

    const user = (await this.getUser(email)) || (await this.createUser(email));

    return {
      accessToken: this.authService.login({
        username: user.username,
        email,
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
