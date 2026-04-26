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

function createHttpContext() {
  const request = {
    user: undefined as any,
    headers: {},
    query: {},
    ip: '127.0.0.1',
  };
  const context = {
    switchToHttp: () => ({
      getRequest: () => request,
    }),
  } as unknown as ExecutionContext;
  return { context, request };
}

function createGqlContext() {
  const request = {
    user: undefined as any,
    headers: {},
    query: {},
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
      authenticateRequest: jest.fn(),
    } as any;

    jwtGuard = {
      canActivate: jest.fn().mockResolvedValue(true),
    } as any;

    guard = new HttpUniversalAuthGuard(authService, jwtGuard);
  });

  it('should return true when authenticated', async () => {
    authService.authenticateRequest.mockResolvedValue('authenticated');
    const { context } = createHttpContext();

    const result = await guard.canActivate(context);

    expect(result).toBe(true);
    expect(jwtGuard.canActivate).not.toHaveBeenCalled();
  });

  it('should delegate to JWT guard when result is jwt', async () => {
    authService.authenticateRequest.mockResolvedValue('jwt');
    const { context } = createHttpContext();

    await guard.canActivate(context);

    expect(jwtGuard.canActivate).toHaveBeenCalledWith(context);
  });

  it('should throw UnauthorizedException when anonymous', async () => {
    authService.authenticateRequest.mockResolvedValue('anonymous');
    const { context } = createHttpContext();

    await expect(guard.canActivate(context)).rejects.toThrow(
      UnauthorizedException,
    );
  });

  it('should propagate errors from authenticateRequest', async () => {
    authService.authenticateRequest.mockRejectedValue(
      new UnauthorizedException('API key has expired'),
    );
    const { context } = createHttpContext();

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
      authenticateRequest: jest.fn(),
    } as any;

    jwtGuard = {
      canActivate: jest.fn().mockResolvedValue(true),
    } as any;

    guard = new OptionalHttpUniversalAuthGuard(authService, jwtGuard);
  });

  it('should return true when anonymous (no throw)', async () => {
    authService.authenticateRequest.mockResolvedValue('anonymous');
    const { context } = createHttpContext();

    const result = await guard.canActivate(context);

    expect(result).toBe(true);
    expect(jwtGuard.canActivate).not.toHaveBeenCalled();
  });

  it('should return true when authenticated', async () => {
    authService.authenticateRequest.mockResolvedValue('authenticated');
    const { context } = createHttpContext();

    const result = await guard.canActivate(context);

    expect(result).toBe(true);
  });

  it('should delegate to JWT guard when result is jwt', async () => {
    authService.authenticateRequest.mockResolvedValue('jwt');
    const { context } = createHttpContext();

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
      authenticateRequest: jest.fn(),
    } as any;

    jwtGuard = {
      canActivate: jest.fn().mockResolvedValue(true),
    } as any;

    guard = new GqlUniversalAuthGuard(authService, jwtGuard);
  });

  it('should return true when authenticated', async () => {
    authService.authenticateRequest.mockResolvedValue('authenticated');
    const { context } = createGqlContext();

    const result = await guard.canActivate(context);

    expect(result).toBe(true);
  });

  it('should delegate to JWT guard when result is jwt', async () => {
    authService.authenticateRequest.mockResolvedValue('jwt');
    const { context } = createGqlContext();

    await guard.canActivate(context);

    expect(jwtGuard.canActivate).toHaveBeenCalledWith(context);
  });

  it('should throw when anonymous', async () => {
    authService.authenticateRequest.mockResolvedValue('anonymous');
    const { context } = createGqlContext();

    await expect(guard.canActivate(context)).rejects.toThrow(
      UnauthorizedException,
    );
  });
});

describe('OptionalGqlUniversalAuthGuard', () => {
  let authService: jest.Mocked<UniversalAuthService>;
  let jwtGuard: jest.Mocked<OptionalGqlJwtPassportGuard>;
  let guard: OptionalGqlUniversalAuthGuard;

  beforeEach(() => {
    authService = {
      authenticateRequest: jest.fn(),
    } as any;

    jwtGuard = {
      canActivate: jest.fn().mockResolvedValue(true),
    } as any;

    guard = new OptionalGqlUniversalAuthGuard(authService, jwtGuard);
  });

  it('should return true when anonymous', async () => {
    authService.authenticateRequest.mockResolvedValue('anonymous');
    const { context } = createGqlContext();

    const result = await guard.canActivate(context);

    expect(result).toBe(true);
    expect(jwtGuard.canActivate).not.toHaveBeenCalled();
  });

  it('should return true when authenticated', async () => {
    authService.authenticateRequest.mockResolvedValue('authenticated');
    const { context } = createGqlContext();

    const result = await guard.canActivate(context);

    expect(result).toBe(true);
  });

  it('should delegate to JWT guard when result is jwt', async () => {
    authService.authenticateRequest.mockResolvedValue('jwt');
    const { context } = createGqlContext();

    await guard.canActivate(context);

    expect(jwtGuard.canActivate).toHaveBeenCalledWith(context);
  });
});

describe('GqlJwtPassportGuard', () => {
  it('should extract request from GQL context', () => {
    const request = { headers: {} };
    (GqlExecutionContext.create as jest.Mock).mockReturnValue({
      getContext: () => ({ req: request }),
    });
    const guard = new GqlJwtPassportGuard();

    const result = guard.getRequest({} as ExecutionContext);

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

    const result = guard.getRequest({} as ExecutionContext);

    expect(result).toBe(request);
  });

  it('should return user', () => {
    const guard = new OptionalGqlJwtPassportGuard();

    expect(guard.handleRequest(null, { userId: 'u1' })).toEqual({
      userId: 'u1',
    });
  });

  it('should throw UnauthorizedException when JWT path returns no user', () => {
    const guard = new OptionalGqlJwtPassportGuard();

    expect(() => guard.handleRequest(null, undefined)).toThrow(
      UnauthorizedException,
    );
  });

  it('should propagate JWT validation errors', () => {
    const guard = new OptionalGqlJwtPassportGuard();
    const error = new Error('auth failed');

    expect(() => guard.handleRequest(error, null)).toThrow('auth failed');
  });

  it('should throw when passport reports JWT info without a user', () => {
    const guard = new OptionalGqlJwtPassportGuard();
    const info = new Error('jwt expired');

    expect(() => guard.handleRequest(null, null, info)).toThrow(
      UnauthorizedException,
    );
  });
});

describe('HttpJwtPassportGuard', () => {
  it('should be instantiable', () => {
    const guard = new HttpJwtPassportGuard();
    expect(guard).toBeDefined();
  });
});

describe('OptionalHttpJwtPassportGuard', () => {
  it('should return user when authenticated', () => {
    const guard = new OptionalHttpJwtPassportGuard();

    expect(guard.handleRequest(null, { userId: 'u1' })).toEqual({
      userId: 'u1',
    });
  });

  it('should throw UnauthorizedException when JWT path returns no user', () => {
    const guard = new OptionalHttpJwtPassportGuard();

    expect(() => guard.handleRequest(null, undefined)).toThrow(
      UnauthorizedException,
    );
  });

  it('should propagate JWT validation errors', () => {
    const guard = new OptionalHttpJwtPassportGuard();
    const error = new Error('auth failed');

    expect(() => guard.handleRequest(error, null)).toThrow('auth failed');
  });

  it('should throw when passport reports JWT info without a user', () => {
    const guard = new OptionalHttpJwtPassportGuard();
    const info = new Error('jwt expired');

    expect(() => guard.handleRequest(null, null, info)).toThrow(
      UnauthorizedException,
    );
  });
});
