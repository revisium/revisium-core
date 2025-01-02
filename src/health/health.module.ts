import { Module } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { TerminusModule } from '@nestjs/terminus';
import { DatabaseModule } from 'src/database/database.module';
import { HealthController } from 'src/health/health.controller';
import { NotificationCheck } from 'src/health/notification.check';
import { DatabaseCheck } from 'src/health/database.check';

@Module({
  imports: [DatabaseModule, ConfigModule, TerminusModule],
  controllers: [HealthController],
  providers: [DatabaseCheck, NotificationCheck],
})
export class HealthModule {}
