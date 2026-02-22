import { Module } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { AuthModule } from 'src/features/auth/auth.module';
import { DatabaseModule } from 'src/infrastructure/database/database.module';
import { OAuthClientService } from './oauth-client.service';
import { OAuthAuthorizationService } from './oauth-authorization.service';
import { OAuthTokenService } from './oauth-token.service';
import { OAuthController } from './oauth.controller';

@Module({
  imports: [ConfigModule, DatabaseModule, AuthModule],
  controllers: [OAuthController],
  providers: [OAuthClientService, OAuthAuthorizationService, OAuthTokenService],
  exports: [OAuthTokenService],
})
export class OAuthModule {}
