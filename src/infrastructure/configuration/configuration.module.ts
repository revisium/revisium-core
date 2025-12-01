import { Module } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { CqrsModule } from '@nestjs/cqrs';
import { AuthModule } from 'src/features/auth/auth.module';
import { PluginModule } from 'src/features/plugin/plugin.module';
import { ConfigurationApiService } from 'src/infrastructure/configuration/configuration-api.service';
import { CONFIGURATION_QUERIES } from 'src/infrastructure/configuration/queries';
import { EmailModule } from 'src/infrastructure/email/email.module';

@Module({
  imports: [AuthModule, ConfigModule, CqrsModule, EmailModule, PluginModule],
  providers: [...CONFIGURATION_QUERIES, ConfigurationApiService],
  exports: [ConfigurationApiService],
})
export class ConfigurationModule {}
