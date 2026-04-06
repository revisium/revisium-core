import { ExecutionContext, UnauthorizedException } from '@nestjs/common';
import { GqlExecutionContext } from '@nestjs/graphql';
import { UniversalAuthService } from 'src/features/auth/guards/universal-auth.service';
import {
  HttpUniversalAuthGuard,
  OptionalHttpUniversalAuthGuard,
  HttpJwtPassportGuard,
  OptionalHttpJwtPassportGuard,
} from 'src/features/auth/guards/universal/http-universal-auth.guard';
import {
  GqlUniversalAuthGuard,
  OptionalGqlUniversalAuthGuard,
  GqlJwtPassportGuard,
  OptionalGqlJwtPassportGuard,
} from 'src/features/auth/guards/universal/gql-universal-auth.guard';

jest.mock('@nestjs/graphql', () => ({
  GqlExecutionContext: {
    create: jest.fn(),
  },
}));

function createHttpContext(
  overrides: {
    headers?: Record<string, string>;
    query?: Record<string, string>;
  } = {},
) {
  const request = {
    user: undefined as any,
    headers: overrides.headers || {},
    query: overrides.query || {},
    ip: '127.0.0.1',
  };
  const context = {
    switchToHttp: () => ({
      getRequest: () => request,
    }),
  } as unknown as ExecutionContext;
  return { context, request };
}

function createGqlContext(
  overrides: {
    headers?: Record<string, string>;
    query?: Record<string, string>;
  } = {},
) {
  const request = {
    user: undefined as any,
    headers: overrides.headers || {},
    query: overrides.query || {},
    ip: '127.0.0.1',
  };
  (GqlExecutionContext.create as jest.Mock).mockReturnValue({
    getContext: () => ({ req: request }),
  });
  const context = {} as ExecutionContext;
  return { context, request };
}

describe('HttpUniversalAuthGuard', () => {
  let authService: jest.Mocked<UniversalAuthService>;
  let jwtGuard: jest.Mocked<HttpJwtPassportGuard>;
  let guard: HttpUniversalAuthGuard;

  beforeEach(() => {
    authService = {
      isNoAuthEnabled: false,
      adminUser: { userId: 'admin', email: '' },
      authenticate: jest.fn(),
    } as any;

    jwtGuard = {
      canActivate: jest.fn().mockResolvedValue(true),
    } as any;

    guard = new HttpUniversalAuthGuard(authService, jwtGuard);
  });

  it('should set admin user when NoAuth enabled', async () => {
    (authService as any).isNoAuthEnabled = true;
    const { context, request } = createHttpContext();

    const result = await guard.canActivate(context);

    expect(result).toBe(true);
    expect(request.user).toEqual({ userId: 'admin', email: '' });
    expect(authService.authenticate).not.toHaveBeenCalled();
  });

  it('should set API key user when authenticate succeeds', async () => {
    const apiKeyUser = {
      userId: 'user-1',
      email: 'u@t.com',
      authMethod: 'personal_key' as const,
    };
    authService.authenticate.mockResolvedValue(apiKeyUser);
    const { context, request } = createHttpContext({
      headers: { 'x-api-key': 'rev_1234567890123456789012' },
    });

    const result = await guard.canActivate(context);

    expect(result).toBe(true);
    expect(request.user).toBe(apiKeyUser);
    expect(jwtGuard.canActivate).not.toHaveBeenCalled();
  });

  it('should delegate to JWT guard when authenticate returns null and auth header present', async () => {
    authService.authenticate.mockResolvedValue(null);
    const { context } = createHttpContext({
      headers: { authorization: 'Bearer jwt-token' },
    });

    await guard.canActivate(context);

    expect(jwtGuard.canActivate).toHaveBeenCalledWith(context);
  });

  it('should throw UnauthorizedException when no credentials', async () => {
    authService.authenticate.mockResolvedValue(null);
    const { context } = createHttpContext();

    await expect(guard.canActivate(context)).rejects.toThrow(
      UnauthorizedException,
    );
  });

  it('should propagate errors from authenticate', async () => {
    authService.authenticate.mockRejectedValue(
      new UnauthorizedException('API key has expired'),
    );
    const { context } = createHttpContext({
      headers: { 'x-api-key': 'rev_1234567890123456789012' },
    });

    await expect(guard.canActivate(context)).rejects.toThrow(
      new UnauthorizedException('API key has expired'),
    );
  });
});

describe('OptionalHttpUniversalAuthGuard', () => {
  let authService: jest.Mocked<UniversalAuthService>;
  let jwtGuard: jest.Mocked<OptionalHttpJwtPassportGuard>;
  let guard: OptionalHttpUniversalAuthGuard;

  beforeEach(() => {
    authService = {
      isNoAuthEnabled: false,
      adminUser: { userId: 'admin', email: '' },
      authenticate: jest.fn(),
    } as any;

    jwtGuard = {
      canActivate: jest.fn().mockResolvedValue(true),
    } as any;

    guard = new OptionalHttpUniversalAuthGuard(authService, jwtGuard);
  });

  it('should return true without user when no credentials (anonymous)', async () => {
    authService.authenticate.mockResolvedValue(null);
    const { context, request } = createHttpContext();

    const result = await guard.canActivate(context);

    expect(result).toBe(true);
    expect(request.user).toBeUndefined();
  });

  it('should set admin user when NoAuth enabled', async () => {
    (authService as any).isNoAuthEnabled = true;
    const { context, request } = createHttpContext();

    const result = await guard.canActivate(context);

    expect(result).toBe(true);
    expect(request.user).toEqual({ userId: 'admin', email: '' });
  });

  it('should set API key user when present', async () => {
    const user = {
      userId: 'u1',
      email: '',
      authMethod: 'personal_key' as const,
    };
    authService.authenticate.mockResolvedValue(user);
    const { context, request } = createHttpContext({
      headers: { 'x-api-key': 'rev_1234567890123456789012' },
    });

    const result = await guard.canActivate(context);

    expect(result).toBe(true);
    expect(request.user).toBe(user);
  });

  it('should delegate to JWT guard when auth header present but no API key match', async () => {
    authService.authenticate.mockResolvedValue(null);
    const { context } = createHttpContext({
      headers: { authorization: 'Bearer jwt-token' },
    });

    await guard.canActivate(context);

    expect(jwtGuard.canActivate).toHaveBeenCalledWith(context);
  });
});

describe('GqlUniversalAuthGuard', () => {
  let authService: jest.Mocked<UniversalAuthService>;
  let jwtGuard: jest.Mocked<GqlJwtPassportGuard>;
  let guard: GqlUniversalAuthGuard;

  beforeEach(() => {
    authService = {
      isNoAuthEnabled: false,
      adminUser: { userId: 'admin', email: '' },
      authenticate: jest.fn(),
    } as any;

    jwtGuard = {
      canActivate: jest.fn().mockResolvedValue(true),
    } as any;

    guard = new GqlUniversalAuthGuard(authService, jwtGuard);
  });

  it('should set admin user when NoAuth enabled', async () => {
    (authService as any).isNoAuthEnabled = true;
    const { context, request } = createGqlContext();

    const result = await guard.canActivate(context);

    expect(result).toBe(true);
    expect(request.user).toEqual({ userId: 'admin', email: '' });
  });

  it('should set API key user for GQL context', async () => {
    const user = {
      userId: 'svc',
      email: '',
      authMethod: 'service_key' as const,
    };
    authService.authenticate.mockResolvedValue(user);
    const { context, request } = createGqlContext({
      headers: { 'x-api-key': 'rev_1234567890123456789012' },
    });

    const result = await guard.canActivate(context);

    expect(result).toBe(true);
    expect(request.user).toBe(user);
  });

  it('should delegate to JWT for non-API-key bearer tokens', async () => {
    authService.authenticate.mockResolvedValue(null);
    const { context } = createGqlContext({
      headers: { authorization: 'Bearer eyJhbG' },
    });

    await guard.canActivate(context);

    expect(jwtGuard.canActivate).toHaveBeenCalledWith(context);
  });

  it('should throw when no credentials', async () => {
    authService.authenticate.mockResolvedValue(null);
    const { context } = createGqlContext();

    await expect(guard.canActivate(context)).rejects.toThrow(
      UnauthorizedException,
    );
  });
});

describe('GqlJwtPassportGuard', () => {
  it('should extract request from GQL context', () => {
    const request = { headers: {} };
    (GqlExecutionContext.create as jest.Mock).mockReturnValue({
      getContext: () => ({ req: request }),
    });
    const guard = new GqlJwtPassportGuard();
    const context = {} as ExecutionContext;

    const result = guard.getRequest(context);

    expect(result).toBe(request);
  });
});

describe('OptionalGqlJwtPassportGuard', () => {
  it('should extract request from GQL context', () => {
    const request = { headers: {} };
    (GqlExecutionContext.create as jest.Mock).mockReturnValue({
      getContext: () => ({ req: request }),
    });
    const guard = new OptionalGqlJwtPassportGuard();
    const context = {} as ExecutionContext;

    const result = guard.getRequest(context);

    expect(result).toBe(request);
  });

  it('should return null on auth failure', () => {
    const guard = new OptionalGqlJwtPassportGuard();

    expect(guard.handleRequest(null, undefined)).toBeNull();
    expect(guard.handleRequest(null, { userId: 'u1' })).toEqual({
      userId: 'u1',
    });
  });

  it('should return error when err is truthy', () => {
    const guard = new OptionalGqlJwtPassportGuard();
    const error = new Error('auth failed');

    expect(guard.handleRequest(error, null)).toBe(error);
  });
});

describe('HttpJwtPassportGuard', () => {
  it('should be instantiable', () => {
    const guard = new HttpJwtPassportGuard();
    expect(guard).toBeDefined();
  });
});

describe('OptionalHttpJwtPassportGuard', () => {
  it('should return user as-is in handleRequest', () => {
    const guard = new OptionalHttpJwtPassportGuard();

    expect(guard.handleRequest(null, { userId: 'u1' })).toEqual({
      userId: 'u1',
    });
    expect(guard.handleRequest(null, undefined)).toBeUndefined();
  });
});

describe('OptionalGqlUniversalAuthGuard', () => {
  let authService: jest.Mocked<UniversalAuthService>;
  let jwtGuard: jest.Mocked<OptionalGqlJwtPassportGuard>;
  let guard: OptionalGqlUniversalAuthGuard;

  beforeEach(() => {
    authService = {
      isNoAuthEnabled: false,
      adminUser: { userId: 'admin', email: '' },
      authenticate: jest.fn(),
    } as any;

    jwtGuard = {
      canActivate: jest.fn().mockResolvedValue(true),
    } as any;

    guard = new OptionalGqlUniversalAuthGuard(authService, jwtGuard);
  });

  it('should return true without user when no credentials', async () => {
    authService.authenticate.mockResolvedValue(null);
    const { context, request } = createGqlContext();

    const result = await guard.canActivate(context);

    expect(result).toBe(true);
    expect(request.user).toBeUndefined();
  });

  it('should set user when API key provided', async () => {
    const user = {
      userId: 'u1',
      email: '',
      authMethod: 'personal_key' as const,
    };
    authService.authenticate.mockResolvedValue(user);
    const { context, request } = createGqlContext({
      headers: { 'x-api-key': 'rev_1234567890123456789012' },
    });

    const result = await guard.canActivate(context);

    expect(result).toBe(true);
    expect(request.user).toBe(user);
  });
});
