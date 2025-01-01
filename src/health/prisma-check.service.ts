import { Injectable } from '@nestjs/common';
import { HealthCheckService, PrismaHealthIndicator } from '@nestjs/terminus';
import { PrismaService } from 'src/database/prisma.service';

@Injectable()
export class PrismaCheckService {
  constructor(
    private readonly health: HealthCheckService,
    private readonly prismaHealth: PrismaHealthIndicator,
    private readonly prismaService: PrismaService,
  ) {}

  public check() {
    return this.prismaHealth.pingCheck('prisma', this.prismaService);
  }
}
