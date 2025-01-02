import { BeforeApplicationShutdown, Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';

const DEFAULT_TIMEOUT = 10000;

@Injectable()
export class GracefulShutdownService implements BeforeApplicationShutdown {
  private logger = new Logger(GracefulShutdownService.name);

  constructor(private readonly configService: ConfigService) {}

  public async beforeApplicationShutdown(signal?: string) {
    this.logger.log(`Termination signal ${signal}`);

    if (signal === 'SIGTERM') {
      this.logger.log(`Awaiting ${this.timeout}ms`);

      await sleep(this.timeout);

      this.logger.log(`Shutting down`);
    }
  }

  private get timeout() {
    const value = this.configService.get('GRACEFUL_SHUTDOWN_TIMEOUT');
    return value ? Number.parseInt(value) : DEFAULT_TIMEOUT;
  }
}

const sleep = (timeout: number) =>
  new Promise((resolve) => setTimeout(resolve, timeout));
