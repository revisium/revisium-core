import { Test, TestingModule } from '@nestjs/testing';
import { ConfigService } from '@nestjs/config';
import { ScheduleModule } from '@nestjs/schedule';
import { PrismaService } from 'src/infrastructure/database/prisma.service';
import { LicenseService } from '../license.service';
import { LicensePayload } from '../license-payload.interface';

describe('LicenseService', () => {
  let service: LicenseService;
  let prisma: any;
  let configValues: Record<string, string>;

  const validPayload: LicensePayload = {
    sub: '*',
    features: ['billing', 'sso'],
    exp: Math.floor(Date.now() / 1000) + 86400, // 1 day from now
    iat: Math.floor(Date.now() / 1000),
    iss: 'revisium-licensing',
  };

  const expiredPayload: LicensePayload = {
    ...validPayload,
    exp: Math.floor(Date.now() / 1000) - 8 * 86400, // 8 days ago (beyond 7-day grace)
  };

  const createService = async (
    envOverrides: Record<string, string> = {},
    prismaMock?: any,
  ) => {
    configValues = { ...envOverrides };

    prisma = prismaMock ?? {
      licenseCache: {
        upsert: jest.fn().mockResolvedValue({}),
        findUnique: jest.fn().mockResolvedValue(null),
      },
    };

    const module: TestingModule = await Test.createTestingModule({
      imports: [ScheduleModule.forRoot()],
      providers: [
        LicenseService,
        { provide: PrismaService, useValue: prisma },
        {
          provide: ConfigService,
          useValue: {
            get: (key: string) => configValues[key] ?? undefined,
          },
        },
      ],
    }).compile();

    return module.get(LicenseService);
  };

  const originalFetch = global.fetch;

  beforeEach(async () => {
    service = await createService();
    global.fetch = jest.fn();
  });

  afterEach(() => {
    global.fetch = originalFetch;
    jest.restoreAllMocks();
  });

  describe('hasFeature', () => {
    it('should return false when no license is loaded', () => {
      expect(service.hasFeature('billing')).toBe(false);
    });

    it('should return true for licensed feature after validation', async () => {
      (global.fetch as jest.Mock).mockResolvedValueOnce({
        ok: true,
        json: () => Promise.resolve(validPayload),
      });

      service = await createService({
        REVISIUM_LICENSE_KEY: 'rev_lic_test',
      });
      await service.onModuleInit();

      expect(service.hasFeature('billing')).toBe(true);
      expect(service.hasFeature('sso')).toBe(true);
    });

    it('should return false for unlicensed feature', async () => {
      (global.fetch as jest.Mock).mockResolvedValueOnce({
        ok: true,
        json: () => Promise.resolve(validPayload),
      });

      service = await createService({
        REVISIUM_LICENSE_KEY: 'rev_lic_test',
      });
      await service.onModuleInit();

      expect(service.hasFeature('audit')).toBe(false);
    });
  });

  describe('expired license', () => {
    it('should return false when license is expired beyond grace period', async () => {
      (global.fetch as jest.Mock).mockResolvedValueOnce({
        ok: true,
        json: () => Promise.resolve(expiredPayload),
      });

      service = await createService({
        REVISIUM_LICENSE_KEY: 'rev_lic_test',
      });
      await service.onModuleInit();

      expect(service.hasFeature('billing')).toBe(false);
    });

    it('should return true when license is expired but within grace period', async () => {
      const recentlyExpired: LicensePayload = {
        ...validPayload,
        exp: Math.floor(Date.now() / 1000) - 86400, // 1 day ago (within 7-day grace)
      };

      (global.fetch as jest.Mock).mockResolvedValueOnce({
        ok: true,
        json: () => Promise.resolve(recentlyExpired),
      });

      service = await createService({
        REVISIUM_LICENSE_KEY: 'rev_lic_test',
      });
      await service.onModuleInit();

      expect(service.hasFeature('billing')).toBe(true);
    });
  });

  describe('DB persistence', () => {
    it('should persist license to database after successful validation', async () => {
      (global.fetch as jest.Mock).mockResolvedValueOnce({
        ok: true,
        json: () => Promise.resolve(validPayload),
      });

      service = await createService({
        REVISIUM_LICENSE_KEY: 'rev_lic_test',
      });
      await service.onModuleInit();

      expect(prisma.licenseCache.upsert).toHaveBeenCalledWith(
        expect.objectContaining({
          where: { id: 'current' },
          update: expect.objectContaining({
            payload: validPayload,
          }),
          create: expect.objectContaining({
            id: 'current',
            payload: validPayload,
          }),
        }),
      );
    });

    it('should fall back to DB cache when licensing server unreachable', async () => {
      (global.fetch as jest.Mock).mockRejectedValueOnce(
        new Error('Connection refused'),
      );

      const prismaMock = {
        licenseCache: {
          upsert: jest.fn().mockResolvedValue({}),
          findUnique: jest.fn().mockResolvedValue({
            id: 'current',
            payload: validPayload,
            validatedAt: new Date(),
          }),
        },
      };

      service = await createService(
        {
          REVISIUM_LICENSE_KEY: 'rev_lic_test',
          REVISIUM_LICENSING_URL: 'http://licensing:3000',
        },
        prismaMock,
      );
      await service.onModuleInit();

      expect(service.hasFeature('billing')).toBe(true);
    });

    it('should reject DB cache beyond grace period', async () => {
      (global.fetch as jest.Mock).mockRejectedValueOnce(
        new Error('Connection refused'),
      );

      const expiredBeyondGrace: LicensePayload = {
        ...validPayload,
        exp: Math.floor(Date.now() / 1000) - 8 * 86400, // 8 days ago (beyond 7-day grace)
      };

      const prismaMock = {
        licenseCache: {
          upsert: jest.fn().mockResolvedValue({}),
          findUnique: jest.fn().mockResolvedValue({
            id: 'current',
            payload: expiredBeyondGrace,
            validatedAt: new Date(),
          }),
        },
      };

      service = await createService(
        {
          REVISIUM_LICENSE_KEY: 'rev_lic_test',
          REVISIUM_LICENSING_URL: 'http://licensing:3000',
        },
        prismaMock,
      );
      await service.onModuleInit();

      expect(service.hasFeature('billing')).toBe(false);
    });
  });

  describe('no license key', () => {
    it('should not attempt validation when no key is set', async () => {
      service = await createService();
      await service.onModuleInit();

      expect(global.fetch).not.toHaveBeenCalled();
      expect(service.hasFeature('billing')).toBe(false);
    });
  });
});
