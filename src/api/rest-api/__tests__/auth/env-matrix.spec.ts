import { INestApplication, ValidationPipe } from '@nestjs/common';
import { Test, TestingModule } from '@nestjs/testing';
import cookieParser from 'cookie-parser';
import { register as promRegister } from 'prom-client';
import { CoreModule } from 'src/core/core.module';
import { registerGraphqlEnums } from 'src/api/graphql-api/registerGraphqlEnums';
import {
  prepareData,
  PrepareDataReturnType,
} from 'src/testing/utils/prepareProject';
import { anonPost } from 'src/testing/e2e';

type SetCookieHeader = string[] | string | undefined;

function getCookieAttribute(
  setCookie: SetCookieHeader,
  name: string,
  attribute: string,
): string | undefined {
  const headers = Array.isArray(setCookie)
    ? setCookie
    : setCookie
      ? [setCookie]
      : [];
  for (const entry of headers) {
    const parts = entry.split(';').map((p) => p.trim());
    const [pair] = parts;
    if (pair.startsWith(`${name}=`)) {
      const attr = parts.find(
        (p) =>
          p.toLowerCase() === attribute.toLowerCase() ||
          p.toLowerCase().startsWith(`${attribute.toLowerCase()}=`),
      );
      if (!attr) {
        return undefined;
      }
      const eq = attr.indexOf('=');
      return eq === -1 ? '' : attr.slice(eq + 1);
    }
  }
  return undefined;
}

function hasCookieFlag(
  setCookie: SetCookieHeader,
  name: string,
  flag: string,
): boolean {
  const headers = Array.isArray(setCookie)
    ? setCookie
    : setCookie
      ? [setCookie]
      : [];
  for (const entry of headers) {
    const parts = entry.split(';').map((p) => p.trim().toLowerCase());
    const [pair] = parts;
    if (pair.startsWith(`${name}=`)) {
      return parts.includes(flag.toLowerCase());
    }
  }
  return false;
}

async function createAppWithEnv(
  overrides: Record<string, string | undefined>,
): Promise<INestApplication> {
  const snapshot: Record<string, string | undefined> = {};
  for (const key of Object.keys(overrides)) {
    snapshot[key] = process.env[key];
    if (overrides[key] === undefined) {
      delete process.env[key];
    } else {
      process.env[key] = overrides[key];
    }
  }

  try {
    registerGraphqlEnums();
    // prom-client's default registry is a process-wide singleton. Creating
    // multiple Nest apps in one jest worker tries to re-register the same
    // histograms and throws "metric already registered". Clear between apps.
    promRegister.clear();

    const moduleFixture: TestingModule = await Test.createTestingModule({
      imports: [CoreModule.forRoot({ mode: 'monolith' })],
    }).compile();

    const app = moduleFixture.createNestApplication();
    app.use(cookieParser());
    app.useGlobalPipes(new ValidationPipe({ transform: true }));
    await app.init();

    return app;
  } finally {
    for (const key of Object.keys(snapshot)) {
      if (snapshot[key] === undefined) {
        delete process.env[key];
      } else {
        process.env[key] = snapshot[key];
      }
    }
  }
}

const isOptIn = process.env.JWT_ENV_MATRIX === '1';
const describeOrSkip = isOptIn ? describe : describe.skip;

describeOrSkip('restapi - auth env matrix (opt-in: JWT_ENV_MATRIX=1)', () => {
  let fixture: PrepareDataReturnType;

  type Scenario = {
    name: string;
    env: Record<string, string | undefined>;
    expectAccessSameSite: string;
    expectRefreshSameSite: string;
    expectSecure: boolean;
  };

  const scenarios: Scenario[] = [
    {
      name: 'defaults (no env set)',
      env: {
        COOKIE_SECURE: undefined,
        COOKIE_SAMESITE: undefined,
        NODE_ENV: 'test',
      },
      expectAccessSameSite: 'Lax',
      expectRefreshSameSite: 'Lax',
      expectSecure: false,
    },
    {
      name: 'COOKIE_SECURE=true only',
      env: {
        COOKIE_SECURE: 'true',
        COOKIE_SAMESITE: undefined,
        NODE_ENV: 'test',
      },
      expectAccessSameSite: 'Lax',
      expectRefreshSameSite: 'Lax',
      expectSecure: true,
    },
    {
      name: 'COOKIE_SAMESITE=strict + COOKIE_SECURE=true',
      env: {
        COOKIE_SECURE: 'true',
        COOKIE_SAMESITE: 'strict',
        NODE_ENV: 'test',
      },
      expectAccessSameSite: 'Strict',
      expectRefreshSameSite: 'Strict',
      expectSecure: true,
    },
    {
      name: 'COOKIE_SAMESITE=none + COOKIE_SECURE=true',
      env: {
        COOKIE_SECURE: 'true',
        COOKIE_SAMESITE: 'none',
        NODE_ENV: 'test',
      },
      expectAccessSameSite: 'None',
      expectRefreshSameSite: 'None',
      expectSecure: true,
    },
    {
      name: 'invalid COOKIE_SAMESITE falls back to lax',
      env: {
        COOKIE_SECURE: 'true',
        COOKIE_SAMESITE: 'relaxed',
        NODE_ENV: 'test',
      },
      expectAccessSameSite: 'Lax',
      expectRefreshSameSite: 'Lax',
      expectSecure: true,
    },
  ];

  for (const scenario of scenarios) {
    describe(scenario.name, () => {
      let app: INestApplication;

      beforeAll(async () => {
        app = await createAppWithEnv(scenario.env);
        fixture = await prepareData(app);
      });

      afterAll(async () => {
        if (app) {
          await app.close();
        }
      });

      it('login sets cookies with expected attributes', async () => {
        const res = await anonPost(app, '/api/auth/login', {
          emailOrUsername: fixture.owner.user.username,
          password: 'password',
        }).expect(201);

        const setCookie = res.headers['set-cookie'] as SetCookieHeader;

        expect(getCookieAttribute(setCookie, 'rev_at', 'SameSite')).toBe(
          scenario.expectAccessSameSite,
        );
        expect(getCookieAttribute(setCookie, 'rev_rt', 'SameSite')).toBe(
          scenario.expectRefreshSameSite,
        );
        expect(hasCookieFlag(setCookie, 'rev_at', 'Secure')).toBe(
          scenario.expectSecure,
        );
        expect(hasCookieFlag(setCookie, 'rev_rt', 'Secure')).toBe(
          scenario.expectSecure,
        );
        expect(hasCookieFlag(setCookie, 'rev_at', 'HttpOnly')).toBe(true);
        expect(hasCookieFlag(setCookie, 'rev_rt', 'HttpOnly')).toBe(true);

        expect(getCookieAttribute(setCookie, 'rev_at', 'Path')).toBe('/');
        expect(getCookieAttribute(setCookie, 'rev_rt', 'Path')).toBe(
          '/api/auth/',
        );
      });
    });
  }

  describe('COOKIE_SAMESITE=none without COOKIE_SECURE fails at boot', () => {
    it('throws when constructing CookieService', async () => {
      await expect(
        createAppWithEnv({
          COOKIE_SECURE: 'false',
          COOKIE_SAMESITE: 'none',
          NODE_ENV: 'test',
        }),
      ).rejects.toThrow(/SameSite=.*none.*requires COOKIE_SECURE/i);
    });
  });
});

if (!isOptIn) {
  // Minimal placeholder so Jest doesn't report "no tests found" when the
  // file is included without the opt-in env var.
  describe('env matrix (skipped — set JWT_ENV_MATRIX=1 to enable)', () => {
    it.skip('gated behind JWT_ENV_MATRIX', () => {
      expect(true).toBe(true);
    });
  });
}
