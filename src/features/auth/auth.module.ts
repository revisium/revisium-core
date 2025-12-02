import { Module } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { CqrsModule } from '@nestjs/cqrs';
import { JwtModule } from '@nestjs/jwt';
import { PassportModule } from '@nestjs/passport';
import { AuthService } from 'src/features/auth/auth.service';
import { CaslAbilityFactory } from 'src/features/auth/casl-ability.factory';
import { AUTH_COMMANDS } from 'src/features/auth/commands';
import { AuthApiService } from 'src/features/auth/commands/auth-api.service';
import { GitHubAuthService } from 'src/features/auth/github-oauth.service';
import { GoogleOauthService } from 'src/features/auth/google-oauth.service';
import { JwtSecretService } from 'src/features/auth/jwt-secret.service';
import { JwtStrategy } from 'src/features/auth/strategy/jwt.strategy';
import { DatabaseModule } from 'src/infrastructure/database/database.module';
import { EmailModule } from 'src/infrastructure/email/email.module';

@Module({
  imports: [
    CqrsModule,
    DatabaseModule,
    ConfigModule,
    PassportModule,
    JwtModule.register({
      global: true,
    }),
    EmailModule,
  ],
  providers: [
    AuthApiService,
    AuthService,
    JwtStrategy,
    JwtSecretService,
    GoogleOauthService,
    GitHubAuthService,
    CaslAbilityFactory,
    ...AUTH_COMMANDS,
  ],
  exports: [
    AuthService,
    GoogleOauthService,
    GitHubAuthService,
    AuthApiService,
    JwtSecretService,
  ],
})
export class AuthModule {}
