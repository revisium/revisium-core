import { Inject, Injectable, OnModuleDestroy } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { HealthIndicatorService } from '@nestjs/terminus';
import Redis from 'ioredis';
import { APP_OPTIONS_TOKEN, AppOptions } from 'src/app-mode';

@Injectable()
export class NotificationCheck implements OnModuleDestroy {
  private redis?: Redis;
  private connectPromise?: Promise<void>;

  constructor(
    private readonly configService: ConfigService,
    private readonly healthIndicator: HealthIndicatorService,
    @Inject(APP_OPTIONS_TOKEN) private readonly appOptions: AppOptions,
  ) {}

  public get available() {
    return (
      this.appOptions.mode === 'microservice' && this.hasRedisConfiguration()
    );
  }

  public async check() {
    const indicator = this.healthIndicator.check('notifications');
    const redis = this.getRedis();

    try {
      await this.ensureConnected(redis);
      await redis.ping();
      return indicator.up();
    } catch (error) {
      return indicator.down(
        error instanceof Error
          ? error.message
          : 'Redis notification bus is not available',
      );
    }
  }

  public async onModuleDestroy() {
    if (!this.redis) {
      return;
    }

    try {
      await this.redis.quit();
    } catch {
      this.redis.disconnect();
    }
  }

  private getRedis() {
    if (this.redis) {
      return this.redis;
    }

    const portPath = 'ENDPOINT_PORT';
    const hostPath = 'ENDPOINT_HOST';

    const envPort = this.configService.get<string>(portPath);

    if (!envPort) {
      throw new Error(`Environment variable not found: ${portPath}`);
    }
    const port = Number.parseInt(envPort);

    const host = this.configService.get<string>(hostPath);

    if (!host) {
      throw new Error(`Environment variable not found: ${hostPath}`);
    }

    this.redis = new Redis({
      host,
      port,
      lazyConnect: true,
      enableOfflineQueue: false,
      maxRetriesPerRequest: 1,
      connectTimeout: 1000,
      retryStrategy: (times) => Math.min(times * 100, 1000),
    });
    this.redis.on('error', () => undefined);

    return this.redis;
  }

  private hasRedisConfiguration() {
    return Boolean(
      this.configService.get<string>('ENDPOINT_HOST') &&
      this.configService.get<string>('ENDPOINT_PORT'),
    );
  }

  private async ensureConnected(redis: Redis) {
    if (redis.status === 'ready') {
      return;
    }

    if (this.connectPromise) {
      await this.connectPromise;
      return;
    }

    if (redis.status !== 'wait' && redis.status !== 'end') {
      return;
    }

    this.connectPromise = redis.connect().finally(() => {
      this.connectPromise = undefined;
    });

    await this.connectPromise;
  }
}
