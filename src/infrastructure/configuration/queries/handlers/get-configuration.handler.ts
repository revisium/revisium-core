import { IQueryHandler, QueryHandler } from '@nestjs/cqrs';
import { GitHubAuthService } from 'src/features/auth/github-oauth.service';
import { GoogleOauthService } from 'src/features/auth/google-oauth.service';
import {
  GetConfigurationQuery,
  GetConfigurationQueryReturnType,
} from 'src/infrastructure/configuration/queries/impl';
import { EmailService } from 'src/infrastructure/email/email.service';

@QueryHandler(GetConfigurationQuery)
export class GetConfigurationHandler
  implements
    IQueryHandler<GetConfigurationQuery, GetConfigurationQueryReturnType>
{
  constructor(
    private readonly emailService: EmailService,
    private readonly googleOauthService: GoogleOauthService,
    private readonly githubOauthService: GitHubAuthService,
  ) {}

  public async execute(): Promise<GetConfigurationQueryReturnType> {
    return {
      availableEmailSignUp: this.isAvailableEmailSignUp,
      google: {
        available: this.googleOauthService.isAvailable,
        clientId: this.googleOauthService.clientId,
      },
      github: {
        available: this.githubOauthService.isAvailable,
        clientId: this.githubOauthService.clientId,
      },
    };
  }

  private get isAvailableEmailSignUp(): boolean {
    return this.emailService.isAvailable;
  }
}
