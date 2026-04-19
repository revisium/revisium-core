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

// Jest creates a fresh PrismaClient per test file and never disposes
// the previous one; keep the pool small so accumulated per-file pools
// don't exhaust pg's max_connections at higher worker counts.
const STUB_POOL_MAX = (() => {
  const parsed = Number(process.env.TEST_PG_POOL_MAX);
  return Number.isFinite(parsed) && parsed > 0 ? parsed : 3;
})();

let beforeExitRegistered = false;

function getPrismaClient(): PrismaClient {
  const info = getInfo();
  if (cached && cached.prisma) return cached.prisma;
  const adapter = new PrismaPg({
    connectionString: process.env.DATABASE_URL,
    max: STUB_POOL_MAX,
  });
  const prisma = new PrismaClient({ adapter });
  cached = { info, prisma };

  // Belt-and-suspenders: even if no afterAll ever calls app.close(),
  // drain the pool on worker exit so jest doesn't print the
  // "did not exit one second after…" open-handle warning.
  if (!beforeExitRegistered) {
    beforeExitRegistered = true;
    process.once('beforeExit', async () => {
      if (cached?.prisma) {
        try {
          await cached.prisma.$disconnect();
        } catch {
          // ignore
        }
      }
    });
  }
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
    // Release the per-worker client and clear the cache so the next
    // spec in the worker gets a fresh one (vs. a disconnected stale
    // reference).
    close: async () => {
      if (cached?.prisma) {
        const prisma = cached.prisma;
        cached.prisma = null;
        await prisma.$disconnect();
      }
    },
    init: async () => {},
    use: () => stub,
    useGlobalPipes: () => stub,
  };

  return stub as unknown as INestApplication;
}
