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

// Per-file cache — each test file gets a fresh module registry, so this
// holds resources for just one file's tests.
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

function getPrismaClient(): PrismaClient {
  const info = getInfo();
  if (cached && cached.prisma) return cached.prisma;
  const adapter = new PrismaPg({
    connectionString: process.env.DATABASE_URL,
  });
  const prisma = new PrismaClient({ adapter });
  cached = { info, prisma };
  return prisma;
}

function makeFakeAuthService(): Pick<AuthService, 'login'> {
  return {
    login(payload) {
      const info = getInfo();
      return sign(payload as object, info.jwtSecret);
    },
  } as Pick<AuthService, 'login'>;
}

function makeFakeHttpServer(port: number): {
  address: () => AddressInfo;
  listen: () => unknown;
  close: () => unknown;
} {
  return {
    address: () => ({
      port,
      address: '127.0.0.1',
      family: 'IPv4',
    }),
    listen() {
      return this;
    },
    close() {
      return this;
    },
  };
}

/**
 * Returns an `INestApplication`-compatible stub that routes HTTP calls to the
 * shared Nest app started in `globalSetup`, and provides lightweight
 * per-worker replacements for the small set of providers the test kit
 * resolves in-process (Prisma, AuthService).
 *
 * Test files that need the full Nest DI graph (overrideProvider, private
 * services) should call `getFullTestApp()` instead.
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
      if (cached?.prisma) {
        await cached.prisma.$disconnect();
      }
    },
    init: async () => {
      // no-op — app is already initialized in globalSetup
    },
    use: () => stub,
    useGlobalPipes: () => stub,
  };

  return stub as unknown as INestApplication;
}
