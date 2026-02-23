import { Test } from '@nestjs/testing';
import { CommandBus } from '@nestjs/cqrs';
import { CleanService } from 'src/infrastructure/clean/clean.service';
import { CleanTablesCommand } from 'src/infrastructure/clean/commands/impl/clean-tables.command';
import { CleanRowsCommand } from 'src/infrastructure/clean/commands/impl/clean-rows.command';
import { CleanOAuthExpiredCodesCommand } from 'src/infrastructure/clean/commands/impl/clean-oauth-expired-codes.command';
import { CleanOAuthExpiredAccessTokensCommand } from 'src/infrastructure/clean/commands/impl/clean-oauth-expired-access-tokens.command';
import { CleanOAuthExpiredRefreshTokensCommand } from 'src/infrastructure/clean/commands/impl/clean-oauth-expired-refresh-tokens.command';

describe('CleanService', () => {
  let service: CleanService;
  let commandBus: { execute: jest.Mock };

  beforeEach(async () => {
    commandBus = { execute: jest.fn() };

    const module = await Test.createTestingModule({
      providers: [CleanService, { provide: CommandBus, useValue: commandBus }],
    }).compile();

    service = module.get(CleanService);
  });

  describe('cleanTablesAndRows', () => {
    it('should execute CleanTablesCommand and CleanRowsCommand', async () => {
      commandBus.execute.mockResolvedValue({ count: 0 });

      await service.cleanTablesAndRows();

      expect(commandBus.execute).toHaveBeenCalledTimes(2);
      expect(commandBus.execute).toHaveBeenNthCalledWith(
        1,
        expect.any(CleanTablesCommand),
      );
      expect(commandBus.execute).toHaveBeenNthCalledWith(
        2,
        expect.any(CleanRowsCommand),
      );
    });

    it('should log when tables are deleted', async () => {
      commandBus.execute
        .mockResolvedValueOnce({ count: 3 })
        .mockResolvedValueOnce({ count: 0 });

      const logSpy = jest.spyOn(service['logger'], 'log');

      await service.cleanTablesAndRows();

      expect(logSpy).toHaveBeenCalledTimes(1);
      expect(logSpy).toHaveBeenCalledWith('deleted 3 empty [Table]s');
    });

    it('should log when rows are deleted', async () => {
      commandBus.execute
        .mockResolvedValueOnce({ count: 0 })
        .mockResolvedValueOnce({ count: 5 });

      const logSpy = jest.spyOn(service['logger'], 'log');

      await service.cleanTablesAndRows();

      expect(logSpy).toHaveBeenCalledTimes(1);
      expect(logSpy).toHaveBeenCalledWith('deleted 5 empty [Row]s');
    });

    it('should not log when nothing is deleted', async () => {
      commandBus.execute.mockResolvedValue({ count: 0 });

      const logSpy = jest.spyOn(service['logger'], 'log');

      await service.cleanTablesAndRows();

      expect(logSpy).not.toHaveBeenCalled();
    });
  });

  describe('cleanOAuthTokens', () => {
    it('should execute all three OAuth cleanup commands', async () => {
      commandBus.execute.mockResolvedValue({ count: 0 });

      await service.cleanOAuthTokens();

      expect(commandBus.execute).toHaveBeenCalledTimes(3);
      expect(commandBus.execute).toHaveBeenNthCalledWith(
        1,
        expect.any(CleanOAuthExpiredCodesCommand),
      );
      expect(commandBus.execute).toHaveBeenNthCalledWith(
        2,
        expect.any(CleanOAuthExpiredAccessTokensCommand),
      );
      expect(commandBus.execute).toHaveBeenNthCalledWith(
        3,
        expect.any(CleanOAuthExpiredRefreshTokensCommand),
      );
    });

    it('should log when expired codes are deleted', async () => {
      commandBus.execute
        .mockResolvedValueOnce({ count: 7 })
        .mockResolvedValueOnce({ count: 0 })
        .mockResolvedValueOnce({ count: 0 });

      const logSpy = jest.spyOn(service['logger'], 'log');

      await service.cleanOAuthTokens();

      expect(logSpy).toHaveBeenCalledTimes(1);
      expect(logSpy).toHaveBeenCalledWith(
        'deleted 7 expired [OAuthAuthorizationCode]s',
      );
    });

    it('should log when expired access tokens are deleted', async () => {
      commandBus.execute
        .mockResolvedValueOnce({ count: 0 })
        .mockResolvedValueOnce({ count: 12 })
        .mockResolvedValueOnce({ count: 0 });

      const logSpy = jest.spyOn(service['logger'], 'log');

      await service.cleanOAuthTokens();

      expect(logSpy).toHaveBeenCalledTimes(1);
      expect(logSpy).toHaveBeenCalledWith(
        'deleted 12 expired [OAuthAccessToken]s',
      );
    });

    it('should log when expired refresh tokens are deleted', async () => {
      commandBus.execute
        .mockResolvedValueOnce({ count: 0 })
        .mockResolvedValueOnce({ count: 0 })
        .mockResolvedValueOnce({ count: 4 });

      const logSpy = jest.spyOn(service['logger'], 'log');

      await service.cleanOAuthTokens();

      expect(logSpy).toHaveBeenCalledTimes(1);
      expect(logSpy).toHaveBeenCalledWith(
        'deleted 4 expired [OAuthRefreshToken]s',
      );
    });

    it('should not log when nothing is deleted', async () => {
      commandBus.execute.mockResolvedValue({ count: 0 });

      const logSpy = jest.spyOn(service['logger'], 'log');

      await service.cleanOAuthTokens();

      expect(logSpy).not.toHaveBeenCalled();
    });
  });
});
