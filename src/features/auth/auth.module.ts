import { Module } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { CqrsModule } from '@nestjs/cqrs';
import { JwtModule } from '@nestjs/jwt';
import { PassportModule } from '@nestjs/passport';
import { ApiKeyModule } from 'src/features/api-key/api-key.module';
import { AuthService } from 'src/features/auth/auth.service';
import { CaslAbilityFactory } from 'src/features/auth/casl-ability.factory';
import { AUTH_COMMANDS } from 'src/features/auth/commands';
import { AuthApiService } from 'src/features/auth/commands/auth-api.service';
import { GitHubAuthService } from 'src/features/auth/github-oauth.service';
import { GoogleOauthService } from 'src/features/auth/google-oauth.service';
import { UniversalAuthService } from 'src/features/auth/guards/universal-auth.service';
import {
  GqlJwtPassportGuard,
  GqlUniversalAuthGuard,
  OptionalGqlJwtPassportGuard,
  OptionalGqlUniversalAuthGuard,
} from 'src/features/auth/guards/universal/gql-universal-auth.guard';
import {
  HttpJwtPassportGuard,
  HttpUniversalAuthGuard,
  OptionalHttpJwtPassportGuard,
  OptionalHttpUniversalAuthGuard,
} from 'src/features/auth/guards/universal/http-universal-auth.guard';
import { JwtSecretService } from 'src/features/auth/jwt-secret.service';
import { NoAuthService } from 'src/features/auth/no-auth.service';
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
    ApiKeyModule,
  ],
  providers: [
    AuthApiService,
    AuthService,
    JwtStrategy,
    JwtSecretService,
    GoogleOauthService,
    GitHubAuthService,
    CaslAbilityFactory,
    NoAuthService,
    UniversalAuthService,
    HttpUniversalAuthGuard,
    OptionalHttpUniversalAuthGuard,
    HttpJwtPassportGuard,
    OptionalHttpJwtPassportGuard,
    GqlUniversalAuthGuard,
    OptionalGqlUniversalAuthGuard,
    GqlJwtPassportGuard,
    OptionalGqlJwtPassportGuard,
    ...AUTH_COMMANDS,
  ],
  exports: [
    AuthService,
    GoogleOauthService,
    GitHubAuthService,
    AuthApiService,
    JwtSecretService,
    NoAuthService,
    UniversalAuthService,
    CaslAbilityFactory,
    HttpUniversalAuthGuard,
    OptionalHttpUniversalAuthGuard,
    GqlUniversalAuthGuard,
    OptionalGqlUniversalAuthGuard,
    ApiKeyModule,
  ],
})
export class AuthModule {}
