import { Module } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { TerminusModule } from '@nestjs/terminus';
import { DatabaseModule } from 'src/database/database.module';
import { HealthController } from 'src/health/health.controller';
import { NotificationCheckService } from 'src/health/notification-check.service';
import { PrismaCheckService } from 'src/health/prisma-check.service';

@Module({
  imports: [DatabaseModule, ConfigModule, TerminusModule],
  controllers: [HealthController],
  providers: [PrismaCheckService, NotificationCheckService],
})
export class HealthModule {}
