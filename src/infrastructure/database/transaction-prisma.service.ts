import {
  Injectable,
  InternalServerErrorException,
  Logger,
  OnModuleInit,
} from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { Prisma } from 'src/__generated__/client';
import { AsyncLocalStorage } from 'node:async_hooks';
import { randomInt } from 'node:crypto';
import { PrismaService } from 'src/infrastructure/database/prisma.service';
import { TransactionPrismaClient } from 'src/features/share/types';

export interface TransactionOptions {
  maxWait?: number;
  timeout?: number;
  isolationLevel?: Prisma.TransactionIsolationLevel;
  retry?: {
    maxRetries: number;
    baseDelayMs: number;
    maxDelayMs: number;
  };
}

/**
 * Default retry options for SERIALIZABLE transactions.
 *
 * These values are tuned based on load testing:
 * - 100 concurrent: 100% success
 * - 500 concurrent: 100% success
 * - 1000 concurrent: 82% success (limited by connection pool, not retries)
 *
 * For >500 concurrent requests, increase connection pool size in PostgreSQL/Prisma.
 */
const DEFAULT_SERIALIZABLE_OPTIONS: Required<TransactionOptions> = {
  maxWait: 10000, // 10s - increased for high load (connection pool wait)
  timeout: 15000, // 15s - transaction timeout
  isolationLevel: Prisma.TransactionIsolationLevel.Serializable,
  retry: {
    maxRetries: 20, // 20 attempts - handles high contention scenarios
    baseDelayMs: 30, // 30ms - fast first retry
    maxDelayMs: 1500, // 1.5s - cap on exponential backoff
  },
};

@Injectable()
export class TransactionPrismaService implements OnModuleInit {
  private readonly logger = new Logger(TransactionPrismaService.name);

  private readonly asyncLocalStorage = new AsyncLocalStorage<{
    $prisma: TransactionPrismaClient;
  }>();

  private readonly serializableOptions: Required<TransactionOptions>;

  constructor(
    private readonly prismaService: PrismaService,
    private readonly configService: ConfigService,
  ) {
    this.serializableOptions = this.buildSerializableOptions();
  }

  onModuleInit() {
    this.logTransactionSettings();
  }

  private buildSerializableOptions(): Required<TransactionOptions> {
    return {
      maxWait: this.getEnvNumber(
        'TRANSACTION_MAX_WAIT',
        DEFAULT_SERIALIZABLE_OPTIONS.maxWait,
      ),
      timeout: this.getEnvNumber(
        'TRANSACTION_TIMEOUT',
        DEFAULT_SERIALIZABLE_OPTIONS.timeout,
      ),
      isolationLevel: DEFAULT_SERIALIZABLE_OPTIONS.isolationLevel,
      retry: {
        maxRetries: this.getEnvNumber(
          'TRANSACTION_MAX_RETRIES',
          DEFAULT_SERIALIZABLE_OPTIONS.retry.maxRetries,
        ),
        baseDelayMs: this.getEnvNumber(
          'TRANSACTION_BASE_DELAY_MS',
          DEFAULT_SERIALIZABLE_OPTIONS.retry.baseDelayMs,
        ),
        maxDelayMs: this.getEnvNumber(
          'TRANSACTION_MAX_DELAY_MS',
          DEFAULT_SERIALIZABLE_OPTIONS.retry.maxDelayMs,
        ),
      },
    };
  }

  private getEnvNumber(key: string, defaultValue: number): number {
    const value = this.configService.get<string>(key);

    if (!value) {
      return defaultValue;
    }

    const parsed = Number.parseInt(value, 10);

    if (Number.isNaN(parsed)) {
      this.logger.warn(
        `Invalid value for ${key}: "${value}" is not a number, using default ${defaultValue}`,
      );
      return defaultValue;
    }

    return parsed;
  }

  private logTransactionSettings() {
    const settings = [
      this.formatSetting(
        'maxWait',
        this.serializableOptions.maxWait,
        DEFAULT_SERIALIZABLE_OPTIONS.maxWait,
        'TRANSACTION_MAX_WAIT',
      ),
      this.formatSetting(
        'timeout',
        this.serializableOptions.timeout,
        DEFAULT_SERIALIZABLE_OPTIONS.timeout,
        'TRANSACTION_TIMEOUT',
      ),
      this.formatSetting(
        'maxRetries',
        this.serializableOptions.retry.maxRetries,
        DEFAULT_SERIALIZABLE_OPTIONS.retry.maxRetries,
        'TRANSACTION_MAX_RETRIES',
        '',
      ),
      this.formatSetting(
        'baseDelayMs',
        this.serializableOptions.retry.baseDelayMs,
        DEFAULT_SERIALIZABLE_OPTIONS.retry.baseDelayMs,
        'TRANSACTION_BASE_DELAY_MS',
      ),
      this.formatSetting(
        'maxDelayMs',
        this.serializableOptions.retry.maxDelayMs,
        DEFAULT_SERIALIZABLE_OPTIONS.retry.maxDelayMs,
        'TRANSACTION_MAX_DELAY_MS',
      ),
    ];

    this.logger.log(`Transaction settings: ${settings.join(', ')}`);
  }

  private formatSetting(
    name: string,
    value: number,
    defaultValue: number,
    envKey: string,
    unit = 'ms',
  ): string {
    const isOverridden = value !== defaultValue;
    return isOverridden
      ? `${name}=${value}${unit} (from ${envKey})`
      : `${name}=${value}${unit}`;
  }

  public getTransaction() {
    const transactionInCurrentContext = this.asyncLocalStorage.getStore();

    if (!transactionInCurrentContext?.$prisma) {
      throw new InternalServerErrorException(
        'TransactionPrismaClient not found. It appears that an attempt was made to access a transaction outside the context of TransactionalPrismaService.runTransaction.',
      );
    }

    return transactionInCurrentContext.$prisma;
  }

  public getTransactionUnsafe() {
    const transactionInCurrentContext = this.asyncLocalStorage.getStore();

    return transactionInCurrentContext?.$prisma;
  }

  public getTransactionOrPrisma() {
    return this.getTransactionUnsafe() ?? this.prismaService;
  }

  public async run<T>(
    handler: (...rest: unknown[]) => Promise<T>,
    options?: TransactionOptions,
  ): Promise<T> {
    const { retry, ...prismaOptions } = options || {};

    if (!retry) {
      return this.executeTransaction(handler, prismaOptions);
    }

    return this.executeTransactionWithRetry(handler, prismaOptions, retry);
  }

  public runSerializable<T>(
    handler: (...rest: unknown[]) => Promise<T>,
    options?: Omit<Partial<TransactionOptions>, 'isolationLevel'>,
  ): Promise<T> {
    const mergedOptions: TransactionOptions = {
      maxWait: options?.maxWait ?? this.serializableOptions.maxWait,
      timeout: options?.timeout ?? this.serializableOptions.timeout,
      isolationLevel: this.serializableOptions.isolationLevel,
      retry: options?.retry ?? this.serializableOptions.retry,
    };

    return this.run(handler, mergedOptions);
  }

  private executeTransaction<T>(
    handler: (...rest: unknown[]) => Promise<T>,
    options?: Omit<TransactionOptions, 'retry'>,
  ): Promise<T> {
    return this.prismaService.$transaction(async ($prisma) => {
      return this.asyncLocalStorage.run({ $prisma }, handler);
    }, options);
  }

  private async executeTransactionWithRetry<T>(
    handler: (...rest: unknown[]) => Promise<T>,
    prismaOptions: Omit<TransactionOptions, 'retry'>,
    retryOptions: NonNullable<TransactionOptions['retry']>,
  ): Promise<T> {
    const { maxRetries, baseDelayMs, maxDelayMs } = retryOptions;
    let lastError: Error | undefined;

    for (let attempt = 0; attempt < maxRetries; attempt++) {
      try {
        return await this.executeTransaction(handler, prismaOptions);
      } catch (error) {
        lastError = error as Error;

        if (!this.isRetryableError(lastError)) {
          throw error;
        }

        if (attempt < maxRetries - 1) {
          const delay = this.calculateBackoffDelay(
            attempt,
            baseDelayMs,
            maxDelayMs,
          );
          this.logger.debug(
            `Serialization failure (attempt ${attempt + 1}/${maxRetries}), retrying in ${delay}ms`,
          );
          await this.sleep(delay);
        }
      }
    }

    this.logger.warn(
      `Transaction failed after ${maxRetries} attempts due to serialization conflicts`,
    );
    throw (
      lastError ||
      new Error('Max retries exceeded for serializable transaction')
    );
  }

  /**
   * Check if an error is a retryable serialization failure.
   *
   * PostgreSQL error codes:
   * - 40001: serialization_failure
   * - 40P01: deadlock_detected
   *
   * Prisma error codes:
   * - P2034: Transaction write conflict
   * - P2003: Foreign key constraint failed (race condition on concurrent table creation)
   */
  private isRetryableError(error: Error): boolean {
    const code = (error as { code?: string }).code || '';
    const retryableCodes = ['40001', '40P01', 'P2034', 'P2003'];

    if (retryableCodes.includes(code)) {
      return true;
    }

    const message = error.message || '';
    const retryableMessages = [
      'could not serialize access',
      'deadlock detected',
      'TransactionWriteConflict',
      'Please retry your transaction',
      'Foreign key constraint',
    ];

    return retryableMessages.some((pattern) => message.includes(pattern));
  }

  /**
   * Calculate exponential backoff delay with jitter.
   */
  private calculateBackoffDelay(
    attempt: number,
    baseDelayMs: number,
    maxDelayMs: number,
  ): number {
    const exponentialDelay = baseDelayMs * Math.pow(2, attempt);
    const cappedDelay = Math.min(exponentialDelay, maxDelayMs);
    const maxJitter = Math.floor(cappedDelay * 0.5);
    const jitter = maxJitter > 0 ? randomInt(maxJitter + 1) : 0;
    return cappedDelay + jitter;
  }

  private sleep(ms: number): Promise<void> {
    return new Promise((resolve) => setTimeout(resolve, ms));
  }
}
