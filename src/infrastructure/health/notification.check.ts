import { Inject, Injectable } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { Transport, RedisOptions } from '@nestjs/microservices';
import { MicroserviceHealthIndicator } from '@nestjs/terminus';
import { APP_OPTIONS_TOKEN, AppOptions } from 'src/app-mode';

@Injectable()
export class NotificationCheck {
  constructor(
    private readonly configService: ConfigService,
    private readonly microservice: MicroserviceHealthIndicator,
    @Inject(APP_OPTIONS_TOKEN) private readonly appOptions: AppOptions,
  ) {}

  public get available() {
    return this.appOptions.mode === 'microservice';
  }

  public async check() {
    const portPath = 'ENDPOINT_PORT';
    const hostPath = 'ENDPOINT_HOST';

    const envPort = this.configService.get<string>(portPath);

    if (!envPort) {
      throw new Error(`Environment variable not found: ${portPath}`);
    }
    const port = parseInt(envPort);

    const host = this.configService.get<string>(hostPath);

    if (!host) {
      throw new Error(`Environment variable not found: ${hostPath}`);
    }

    return this.microservice.pingCheck<RedisOptions>('notifications', {
      transport: Transport.REDIS,
      options: {
        host,
        port,
      },
    });
  }
}
