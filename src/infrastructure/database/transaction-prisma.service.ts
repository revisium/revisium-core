import {
  Injectable,
  InternalServerErrorException,
  Logger,
} from '@nestjs/common';
import { Prisma } from 'src/__generated__/client';
import { AsyncLocalStorage } from 'node:async_hooks';
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
export class TransactionPrismaService {
  private readonly logger = new Logger(TransactionPrismaService.name);

  private readonly asyncLocalStorage = new AsyncLocalStorage<{
    $prisma: TransactionPrismaClient;
  }>();

  constructor(private readonly prismaService: PrismaService) {}

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

  /**
   * Run a transaction with optional retry on serialization failures.
   *
   * By default uses READ COMMITTED isolation without retries.
   * Pass `retry` option to enable automatic retry with exponential backoff.
   *
   * @example
   * ```typescript
   * // Simple transaction (no retry)
   * await transactionService.run(async () => {
   *   await updateData();
   * });
   *
   * // With retry on serialization failures
   * await transactionService.run(async () => {
   *   await updateData();
   * }, {
   *   isolationLevel: 'Serializable',
   *   retry: { maxRetries: 10, baseDelayMs: 50, maxDelayMs: 2000 }
   * });
   * ```
   */
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

  /**
   * Run a transaction with SERIALIZABLE isolation level and automatic retry
   * on serialization failures.
   *
   * Use this for operations that:
   * - Read data, make decisions, then write (read-modify-write patterns)
   * - Need to prevent race conditions in copy-on-write scenarios
   * - Create new versions of tables/rows based on readonly state
   *
   * PostgreSQL will detect conflicts and throw serialization errors, which
   * this method will automatically retry with exponential backoff.
   *
   * @example
   * ```typescript
   * await transactionService.runSerializable(async () => {
   *   const table = await findTable(id);
   *   if (table.readonly) {
   *     await createNewTableVersion(table);
   *   }
   *   await updateRow(rowId, data);
   * });
   * ```
   */
  public runSerializable<T>(
    handler: (...rest: unknown[]) => Promise<T>,
    options?: Partial<TransactionOptions>,
  ): Promise<T> {
    const mergedOptions: TransactionOptions = {
      maxWait: options?.maxWait ?? DEFAULT_SERIALIZABLE_OPTIONS.maxWait,
      timeout: options?.timeout ?? DEFAULT_SERIALIZABLE_OPTIONS.timeout,
      isolationLevel:
        options?.isolationLevel ?? DEFAULT_SERIALIZABLE_OPTIONS.isolationLevel,
      retry: options?.retry ?? DEFAULT_SERIALIZABLE_OPTIONS.retry,
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
      lastError || new Error('Max retries exceeded for serializable transaction')
    );
  }

  /**
   * Check if an error is a retryable serialization failure.
   * PostgreSQL error codes:
   * - 40001: serialization_failure
   * - 40P01: deadlock_detected
   *
   * Prisma wraps these errors with different messages.
   */
  private isRetryableError(error: Error): boolean {
    const message = error.message || '';
    const code = (error as { code?: string }).code || '';

    return (
      // PostgreSQL error codes
      code === '40001' ||
      code === '40P01' ||
      // Prisma error codes
      code === 'P2034' || // Transaction write conflict
      // PostgreSQL messages
      message.includes('could not serialize access') ||
      message.includes('deadlock detected') ||
      // Prisma-wrapped messages
      message.includes('write conflict') ||
      message.includes('WriteConflict') ||
      message.includes('TransactionWriteConflict') ||
      message.includes('Please retry your transaction') ||
      message.includes('Serialization') ||
      message.includes('serialization')
    );
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
    const jitter = Math.random() * cappedDelay * 0.5;
    return Math.floor(cappedDelay + jitter);
  }

  private sleep(ms: number): Promise<void> {
    return new Promise((resolve) => setTimeout(resolve, ms));
  }
}
