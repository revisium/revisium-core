import { CommandBus, CommandHandler, ICommandHandler } from '@nestjs/cqrs';
import { UserSystemRoles } from 'src/features/auth/consts';
import { EmailService } from 'src/infrastructure/email/email.service';
import { AuthService } from 'src/features/auth/auth.service';
import {
  CreateUserCommand,
  CreateUserCommandReturnType,
  SignUpCommand,
  SignUpCommandReturnType,
} from 'src/features/auth/commands/impl';

@CommandHandler(SignUpCommand)
export class SignUpHandler
  implements ICommandHandler<SignUpCommand, SignUpCommandReturnType>
{
  constructor(
    private readonly commandBus: CommandBus,
    private readonly authService: AuthService,
    private readonly emailService: EmailService,
  ) {}

  public async execute({ data }: SignUpCommand) {
    const emailCode = this.authService.generateConfirmationCode();

    await this.createUser(data, emailCode);
    await this.emailService.sendVerifyEmail(data.email, emailCode);

    return true;
  }

  private async createUser(data: SignUpCommand['data'], emailCode: string) {
    return this.commandBus.execute<
      CreateUserCommand,
      CreateUserCommandReturnType
    >(
      new CreateUserCommand({
        email: data.email,
        username: data.username,
        password: data.password,
        isEmailConfirmed: false,
        emailCode,
        roleId: UserSystemRoles.systemUser,
      }),
    );
  }
}
