import { Controller, Get, Res, UseGuards } from '@nestjs/common';
import { ApiExcludeController } from '@nestjs/swagger';
import { Response } from 'express';
import * as client from 'prom-client';
import { PrismaService } from 'src/infrastructure/database/prisma.service';
import { bentocacheRegistry } from 'src/infrastructure/cache/revisium-cache.module';
import { MetricsEnabledGuard } from 'src/infrastructure/metrics-api/metrics-enabled.guard';

@ApiExcludeController()
@Controller('metrics')
@UseGuards(MetricsEnabledGuard)
export class MetricsController {
  constructor(private readonly prismaService: PrismaService) {}

  @Get()
  async getMetrics(@Res() response: Response) {
    const merged = client.Registry.merge([client.register, bentocacheRegistry]);
    const metrics = await merged.metrics();

    response.set('Content-Type', client.register.contentType);

    response.end(metrics);
  }
}
