import { Module } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { CqrsModule } from '@nestjs/cqrs';
import { JwtModule } from '@nestjs/jwt';
import { PassportModule } from '@nestjs/passport';
import { AuthService } from 'src/auth/auth.service';
import { CaslAbilityFactory } from 'src/auth/casl-ability.factory';
import { AUTH_COMMANDS } from 'src/auth/commands';
import { GitHubAuthService } from 'src/auth/github-oauth.service';
import { GoogleOauthService } from 'src/auth/google-oauth.service';
import { JwtSecretService } from 'src/auth/jwt-secret.service';
import { JwtStrategy } from 'src/auth/strategy/jwt.strategy';
import { DatabaseModule } from 'src/database/database.module';
import { EmailModule } from 'src/email/email.module';

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
    AuthService,
    JwtStrategy,
    JwtSecretService,
    GoogleOauthService,
    GitHubAuthService,
    CaslAbilityFactory,
    ...AUTH_COMMANDS,
  ],
  exports: [AuthService, GoogleOauthService, GitHubAuthService],
})
export class AuthModule {}
