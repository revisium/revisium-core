import type { AddressInfo } from 'node:net';
import type { INestApplication } from '@nestjs/common';
import { sign } from 'jsonwebtoken';
import { PrismaPg } from '@prisma/adapter-pg';
import { PrismaClient } from 'src/__generated__/client';
import { PrismaService } from 'src/infrastructure/database/prisma.service';
import { AuthService } from 'src/features/auth/auth.service';
import { readSharedAppInfo, SharedAppInfo } from './shared-app-info';

interface CachedResources {
  prisma: PrismaClient | null;
  info: SharedAppInfo;
}

let cached: CachedResources | null = null;

function getInfo(): SharedAppInfo {
  if (cached) return cached.info;
  const info = readSharedAppInfo();
  if (!info) {
    throw new Error(
      'Shared test app not running. Jest globalSetup must have produced the info file.',
    );
  }
  cached = { prisma: null, info };
  return info;
}

// Kept small because jest creates a fresh PrismaClient per test file and
// never closes the previous one. With mw=4 and 50+ files, a larger pool
// would exhaust pg `max_connections`.
const STUB_POOL_MAX = Number(process.env.TEST_PG_POOL_MAX ?? 3);

function getPrismaClient(): PrismaClient {
  const info = getInfo();
  if (cached && cached.prisma) return cached.prisma;
  const adapter = new PrismaPg({
    connectionString: process.env.DATABASE_URL,
    max: STUB_POOL_MAX,
  });
  const prisma = new PrismaClient({ adapter });
  cached = { info, prisma };
  return prisma;
}

function makeFakeAuthService(): Pick<AuthService, 'login'> {
  return {
    login: (payload) => sign(payload as object, getInfo().jwtSecret),
  };
}

function makeFakeHttpServer(port: number): {
  address: () => AddressInfo;
  listen: () => unknown;
  close: () => unknown;
} {
  return {
    address: () => ({ port, address: '127.0.0.1', family: 'IPv4' }),
    listen() {
      return this;
    },
    close() {
      return this;
    },
  };
}

/**
 * `INestApplication`-compatible stub that routes HTTP to the shared
 * Nest app started in globalSetup. Resolves PrismaService and
 * AuthService in-process for the test kit; any other provider throws
 * with a hint to switch to `getFullTestApp()`.
 */
export function getSharedTestApp(): INestApplication {
  const info = getInfo();
  const httpServer = makeFakeHttpServer(info.port);
  const authStub = makeFakeAuthService();

  const stub = {
    getHttpServer: () => httpServer,
    get(token: unknown) {
      if (token === PrismaService) return getPrismaClient();
      if (token === AuthService) return authStub;
      throw new Error(
        `Shared test app stub does not provide ${String((token as { name?: string })?.name ?? token)}. ` +
          `Use getFullTestApp() in this spec if you need full in-process DI access.`,
      );
    },
    close: async () => {
      if (cached?.prisma) await cached.prisma.$disconnect();
    },
    init: async () => {},
    use: () => stub,
    useGlobalPipes: () => stub,
  };

  return stub as unknown as INestApplication;
}
