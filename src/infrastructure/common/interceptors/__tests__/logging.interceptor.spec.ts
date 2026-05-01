import {
  CallHandler,
  ExecutionContext,
  HttpException,
  HttpStatus,
  Logger,
  UnauthorizedException,
} from '@nestjs/common';
import { firstValueFrom, throwError } from 'rxjs';
import { LoggingInterceptor } from '../logging.interceptor';

describe('LoggingInterceptor', () => {
  let interceptor: LoggingInterceptor;
  let errorSpy: jest.SpyInstance;
  let debugSpy: jest.SpyInstance;

  const ctx = {} as ExecutionContext;

  const handlerThrowing = (err: unknown): CallHandler => ({
    handle: () => throwError(() => err),
  });

  beforeEach(() => {
    interceptor = new LoggingInterceptor();
    errorSpy = jest.spyOn(Logger.prototype, 'error').mockImplementation();
    debugSpy = jest.spyOn(Logger.prototype, 'debug').mockImplementation();
  });

  afterEach(() => {
    jest.restoreAllMocks();
  });

  it('does not log expected 4xx HttpException as error', async () => {
    const err = new UnauthorizedException('No refresh token');

    await expect(
      firstValueFrom(interceptor.intercept(ctx, handlerThrowing(err))),
    ).rejects.toBe(err);

    expect(errorSpy).not.toHaveBeenCalled();
  });

  it('logs 5xx HttpException as error with stack', async () => {
    const err = new HttpException('boom', HttpStatus.INTERNAL_SERVER_ERROR);

    await expect(
      firstValueFrom(interceptor.intercept(ctx, handlerThrowing(err))),
    ).rejects.toBe(err);

    expect(errorSpy).toHaveBeenCalledTimes(1);
    expect(errorSpy).toHaveBeenCalledWith(err, err.stack);
  });

  it('logs non-HTTP Error as error with stack', async () => {
    const err = new Error('unexpected');

    await expect(
      firstValueFrom(interceptor.intercept(ctx, handlerThrowing(err))),
    ).rejects.toBe(err);

    expect(errorSpy).toHaveBeenCalledTimes(1);
    expect(errorSpy).toHaveBeenCalledWith(err, err.stack);
  });

  it('emits a debug breadcrumb for expected 4xx without raising error', async () => {
    const err = new UnauthorizedException('No refresh token');

    await expect(
      firstValueFrom(interceptor.intercept(ctx, handlerThrowing(err))),
    ).rejects.toBe(err);

    expect(debugSpy).toHaveBeenCalled();
    expect(errorSpy).not.toHaveBeenCalled();
  });
});
