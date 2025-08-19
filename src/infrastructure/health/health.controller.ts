import { Controller, Get } from '@nestjs/common';
import { ApiOperation, ApiTags } from '@nestjs/swagger';
import { HealthCheck, HealthCheckService } from '@nestjs/terminus';
import type { HealthIndicatorFunction } from '@nestjs/terminus/dist/health-indicator';
import { NotificationCheck } from 'src/infrastructure/health/notification.check';
import { DatabaseCheck } from 'src/infrastructure/health/database.check';

@ApiTags('health')
@Controller('health')
export class HealthController {
  constructor(
    private readonly health: HealthCheckService,
    private readonly prisma: DatabaseCheck,
    private readonly notifications: NotificationCheck,
  ) {}

  @Get('readiness')
  @ApiOperation({ operationId: 'readiness' })
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

  @Get('liveness')
  @ApiOperation({ operationId: 'liveness' })
  @HealthCheck()
  readiness() {
    return this.health.check([]);
  }
}
