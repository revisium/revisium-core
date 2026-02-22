import { BadRequestException } from '@nestjs/common';
import { Test, TestingModule } from '@nestjs/testing';
import { PrismaService } from 'src/infrastructure/database/prisma.service';
import { OAuthClientService } from '../oauth-client.service';

describe('OAuthClientService', () => {
  let service: OAuthClientService;
  let prisma: {
    oAuthClient: {
      create: jest.Mock;
      findUnique: jest.Mock;
    };
  };

  beforeEach(async () => {
    prisma = {
      oAuthClient: {
        create: jest.fn(),
        findUnique: jest.fn(),
      },
    };

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        OAuthClientService,
        { provide: PrismaService, useValue: prisma },
      ],
    }).compile();

    service = module.get(OAuthClientService);
  });

  describe('registerClient', () => {
    it('creates client with hashed secret and returns raw secret', async () => {
      prisma.oAuthClient.create.mockResolvedValue({
        id: 'client-1',
        clientName: 'test-app',
      });

      const result = await service.registerClient({
        clientName: 'test-app',
        redirectUris: ['https://example.com/callback'],
      });

      expect(result.clientId).toBe('client-1');
      expect(result.clientSecret).toMatch(/^ocs_/);
      expect(result.clientName).toBe('test-app');
      expect(prisma.oAuthClient.create).toHaveBeenCalledWith(
        expect.objectContaining({
          data: expect.objectContaining({
            clientName: 'test-app',
            redirectUris: ['https://example.com/callback'],
            grantTypes: ['authorization_code', 'refresh_token'],
          }),
        }),
      );
    });

    it('uses provided grantTypes', async () => {
      prisma.oAuthClient.create.mockResolvedValue({
        id: 'client-2',
        clientName: 'test',
      });

      await service.registerClient({
        clientName: 'test',
        redirectUris: ['https://example.com/cb'],
        grantTypes: ['authorization_code'],
      });

      expect(prisma.oAuthClient.create).toHaveBeenCalledWith(
        expect.objectContaining({
          data: expect.objectContaining({
            grantTypes: ['authorization_code'],
          }),
        }),
      );
    });

    it('rejects invalid redirect_uri', async () => {
      await expect(
        service.registerClient({
          clientName: 'test',
          redirectUris: ['not-a-url'],
        }),
      ).rejects.toThrow(BadRequestException);
    });

    it('rejects non-http/https redirect_uri', async () => {
      await expect(
        service.registerClient({
          clientName: 'test',
          redirectUris: ['ftp://example.com/callback'],
        }),
      ).rejects.toThrow('redirect_uri must use http or https scheme');
    });

    it('rejects http redirect_uri for non-localhost', async () => {
      await expect(
        service.registerClient({
          clientName: 'test',
          redirectUris: ['http://example.com/callback'],
        }),
      ).rejects.toThrow('http redirect_uri is only allowed for localhost');
    });

    it('allows http redirect_uri for localhost', async () => {
      prisma.oAuthClient.create.mockResolvedValue({
        id: 'client-3',
        clientName: 'local-app',
      });

      const result = await service.registerClient({
        clientName: 'local-app',
        redirectUris: ['http://localhost:3000/callback'],
      });

      expect(result.clientId).toBe('client-3');
    });

    it('allows http redirect_uri for 127.0.0.1', async () => {
      prisma.oAuthClient.create.mockResolvedValue({
        id: 'client-4',
        clientName: 'local-app',
      });

      const result = await service.registerClient({
        clientName: 'local-app',
        redirectUris: ['http://127.0.0.1:3000/callback'],
      });

      expect(result.clientId).toBe('client-4');
    });
  });

  describe('findClient', () => {
    it('returns client by id', async () => {
      const mockClient = { id: 'client-1', clientName: 'test' };
      prisma.oAuthClient.findUnique.mockResolvedValue(mockClient);

      const result = await service.findClient('client-1');

      expect(result).toEqual(mockClient);
      expect(prisma.oAuthClient.findUnique).toHaveBeenCalledWith({
        where: { id: 'client-1' },
      });
    });

    it('returns null for unknown client', async () => {
      prisma.oAuthClient.findUnique.mockResolvedValue(null);

      const result = await service.findClient('unknown');

      expect(result).toBeNull();
    });
  });

  describe('validateClientSecret', () => {
    it('returns true for matching secret', async () => {
      prisma.oAuthClient.create.mockImplementation(({ data }) => ({
        id: 'client-1',
        clientSecretHash: data.clientSecretHash,
        clientName: data.clientName,
      }));

      const { clientId, clientSecret } = await service.registerClient({
        clientName: 'test',
        redirectUris: ['https://example.com/cb'],
      });

      prisma.oAuthClient.findUnique.mockResolvedValue(
        prisma.oAuthClient.create.mock.results[0].value,
      );

      const valid = await service.validateClientSecret(clientId, clientSecret);

      expect(valid).toBe(true);
    });

    it('returns false for wrong secret', async () => {
      prisma.oAuthClient.create.mockImplementation(({ data }) => ({
        id: 'client-1',
        clientSecretHash: data.clientSecretHash,
      }));

      await service.registerClient({
        clientName: 'test',
        redirectUris: ['https://example.com/cb'],
      });

      prisma.oAuthClient.findUnique.mockResolvedValue(
        prisma.oAuthClient.create.mock.results[0].value,
      );

      const valid = await service.validateClientSecret(
        'client-1',
        'ocs_wrong_secret',
      );

      expect(valid).toBe(false);
    });

    it('returns false for unknown client', async () => {
      prisma.oAuthClient.findUnique.mockResolvedValue(null);

      const valid = await service.validateClientSecret('unknown', 'ocs_secret');

      expect(valid).toBe(false);
    });
  });
});
