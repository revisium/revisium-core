import { UnauthorizedException } from '@nestjs/common';
import { CommandHandler, ICommandHandler } from '@nestjs/cqrs';
import { AuthService } from 'src/features/auth/auth.service';
import {
  LoginCommand,
  LoginCommandReturnType,
} from 'src/features/auth/commands/impl';
import { NoAuthService } from 'src/features/auth/no-auth.service';
import { PrismaService } from 'src/infrastructure/database/prisma.service';

// bcrypt hash of a value no one will ever type. Used to keep the bcrypt
// compare path running even when the user doesn't exist, so response time
// does not leak user existence. Re-generated with `bcrypt.hash('unused', 10)`
// if ever needed — any valid bcrypt hash is fine.
const DUMMY_BCRYPT_HASH =
  '$2b$10$CwTycUXWue0Thq9StjUM0uJ8.6m8qkq/sN9Zr2tG4q8J6r7N7Mv7m';

const INVALID_CREDENTIALS_MESSAGE = 'Invalid credentials';

@CommandHandler(LoginCommand)
export class LoginHandler implements ICommandHandler<
  LoginCommand,
  LoginCommandReturnType
> {
  constructor(
    private readonly prisma: PrismaService,
    private readonly authService: AuthService,
    private readonly noAuth: NoAuthService,
  ) {}

  async execute({ data }: LoginCommand): Promise<LoginCommandReturnType> {
    if (this.noAuth.enabled) {
      const admin = this.noAuth.adminUser;
      const access = this.authService.signAccessToken({
        username: admin.userId,
        email: admin.email,
        sub: admin.userId,
      });
      return {
        accessToken: access.accessToken,
        refreshToken: null,
        expiresIn: access.expiresIn,
      };
    }

    const user = await this.getUser(data.emailOrUsername);

    // Always run bcrypt compare (even against a dummy hash when the user
    // does not exist) so the response time does not leak account existence
    // to unauthenticated probes. All three failure modes return the same
    // generic "Invalid credentials" message for the same reason.
    const passwordHash = user?.password || DUMMY_BCRYPT_HASH;
    const passwordMatches = await this.authService.comparePassword(
      data.password,
      passwordHash,
    );

    if (!user || !user.password || !passwordMatches) {
      throw new UnauthorizedException(INVALID_CREDENTIALS_MESSAGE);
    }

    if (!user.isEmailConfirmed) {
      throw new UnauthorizedException('Email is not confirmed');
    }

    return this.authService.issueTokens(user, {
      ip: data.ip,
      userAgent: data.userAgent,
    });
  }

  private getUser(emailOrUserName: string) {
    return this.prisma.user.findFirst({
      where: {
        OR: [{ email: emailOrUserName }, { username: emailOrUserName }],
      },
    });
  }
}
