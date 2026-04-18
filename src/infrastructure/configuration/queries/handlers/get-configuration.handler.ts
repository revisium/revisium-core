import { IQueryHandler, QueryHandler } from '@nestjs/cqrs';
import { ConfigService } from '@nestjs/config';
import { GitHubAuthService } from 'src/features/auth/github-oauth.service';
import { GoogleOauthService } from 'src/features/auth/google-oauth.service';
import { NoAuthService } from 'src/features/auth/no-auth.service';
import { FilePlugin } from 'src/features/plugin/file/file.plugin';
import {
  GetConfigurationQuery,
  GetConfigurationQueryReturnType,
} from 'src/infrastructure/configuration/queries/impl/get-configuration.query';
import { EmailService } from 'src/infrastructure/email/email.service';
import { getEnvWithDeprecation } from 'src/utils/env';
import { parseBool } from 'src/utils/utils/parse-bool';

@QueryHandler(GetConfigurationQuery)
export class GetConfigurationHandler implements IQueryHandler<
  GetConfigurationQuery,
  GetConfigurationQueryReturnType
> {
  constructor(
    private readonly configService: ConfigService,
    private readonly emailService: EmailService,
    private readonly googleOauthService: GoogleOauthService,
    private readonly githubOauthService: GitHubAuthService,
    private readonly noAuthService: NoAuthService,
    private readonly filePlugin: FilePlugin,
  ) {}

  public async execute(): Promise<GetConfigurationQueryReturnType> {
    return {
      availableEmailSignUp: this.isAvailableEmailSignUp,
      noAuth: this.noAuthService.enabled,
      google: {
        available: this.googleOauthService.isAvailable,
        clientId: this.googleOauthService.clientId,
      },
      github: {
        available: this.githubOauthService.isAvailable,
        clientId: this.githubOauthService.clientId,
      },
      cache: {
        enabled: parseBool(
          getEnvWithDeprecation(this.configService, 'CACHE_ENABLED'),
        ),
      },
      plugins: {
        file: this.filePlugin.isAvailable,
      },
    };
  }

  private get isAvailableEmailSignUp(): boolean {
    return this.emailService.isAvailable;
  }
}
