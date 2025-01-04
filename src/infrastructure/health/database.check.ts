import { Injectable } from '@nestjs/common';
import { HealthCheckService, PrismaHealthIndicator } from '@nestjs/terminus';
import { PrismaService } from 'src/infrastructure/database/prisma.service';

@Injectable()
export class DatabaseCheck {
  constructor(
    private readonly health: HealthCheckService,
    private readonly prismaHealth: PrismaHealthIndicator,
    private readonly prismaService: PrismaService,
  ) {}

  public check() {
    return this.prismaHealth.pingCheck('database', this.prismaService);
  }
}
