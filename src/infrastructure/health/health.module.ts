import { Module } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { TerminusModule } from '@nestjs/terminus';
import { DatabaseModule } from 'src/infrastructure/database/database.module';
import { HealthController } from 'src/infrastructure/health/health.controller';
import { NotificationCheck } from 'src/infrastructure/health/notification.check';
import { DatabaseCheck } from 'src/infrastructure/health/database.check';

@Module({
  imports: [DatabaseModule, ConfigModule, TerminusModule],
  controllers: [HealthController],
  providers: [DatabaseCheck, NotificationCheck],
})
export class HealthModule {}
