import { Controller, Get } from '@nestjs/common';
import { ApiExcludeController, ApiTags } from '@nestjs/swagger';
import { HealthCheck, HealthCheckService } from '@nestjs/terminus';
import type { HealthIndicatorFunction } from '@nestjs/terminus/dist/health-indicator';
import { NotificationCheckService } from 'src/health/notification-check.service';
import { PrismaCheckService } from 'src/health/prisma-check.service';

@ApiExcludeController()
@ApiTags('health')
@Controller('health')
export class HealthController {
  constructor(
    private readonly health: HealthCheckService,
    private readonly prisma: PrismaCheckService,
    private readonly notifications: NotificationCheckService,
  ) {}

  @Get('liveness')
  @HealthCheck()
  liveness() {
    const indicators: HealthIndicatorFunction[] = [
      async () => this.prisma.check(),
    ];

    if (this.notifications.available) {
      indicators.push(async () => this.notifications.check());
    }

    return this.health.check(indicators);
  }

  @Get('readiness')
  @HealthCheck()
  readiness() {
    return this.health.check([]);
  }
}
