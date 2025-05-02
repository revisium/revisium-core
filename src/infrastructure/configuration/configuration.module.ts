import { Module } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { AuthModule } from 'src/features/auth/auth.module';
import { PluginModule } from 'src/features/plugin/plugin.module';
import { CONFIGURATION_QUERIES } from 'src/infrastructure/configuration/queries';
import { EmailModule } from 'src/infrastructure/email/email.module';

@Module({
  imports: [AuthModule, ConfigModule, EmailModule, PluginModule],
  providers: [...CONFIGURATION_QUERIES],
})
export class ConfigurationModule {}
