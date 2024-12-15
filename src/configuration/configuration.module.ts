import { Module } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { AuthModule } from 'src/auth/auth.module';
import { CONFIGURATION_QUERIES } from 'src/configuration/queries';
import { EmailModule } from 'src/email/email.module';

@Module({
  imports: [AuthModule, ConfigModule, EmailModule],
  providers: [...CONFIGURATION_QUERIES],
})
export class ConfigurationModule {}
