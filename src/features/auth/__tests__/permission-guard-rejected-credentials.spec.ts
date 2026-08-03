import {
  ExecutionContext,
  ForbiddenException,
  NotFoundException,
  UnauthorizedException,
} from '@nestjs/common';
import { GqlExecutionContext } from '@nestjs/graphql';
import { Reflector } from '@nestjs/core';
import { ApiKeyScopeService } from 'src/features/api-key/api-key-scope.service';
import { CaslAbilityFactory } from 'src/features/auth/casl-ability.factory';
import { AuthApiService } from 'src/features/auth/commands/auth-api.service';
import { PermissionAction, PermissionSubject } from 'src/features/auth/consts';
import { BasePermissionGuard } from 'src/features/auth/guards/base-persmission.guard';
import {
  markRejectedCredentials,
  type RequestWithRejectedCredentials,
} from 'src/features/auth/guards/rejected-credentials';
import { IAuthUser, IOptionalAuthUser } from 'src/features/auth/types';

jest.mock('@nestjs/graphql', () => ({
  GqlExecutionContext: {
    create: jest.fn(),
  },
}));

interface TestParams {
  projectId?: string;
}

/**
 * Reads the request through the real `getFromHttpContext` /
 * `getFromGqlContext`, so the marker actually has to survive the trip from
 * the optional auth guard to the permission guard.
 */
class DeniedGuard extends BasePermissionGuard<TestParams> {
  constructor(
    private readonly transport: 'http' | 'gql',
    private readonly denial: unknown,
    reflector: Reflector,
    authApi: AuthApiService,
    scopeService: ApiKeyScopeService,
    casl: CaslAbilityFactory,
  ) {
    super(reflector, authApi, scopeService, casl);
  }

  protected getParams(context: ExecutionContext) {
    return this.transport === 'http'
      ? this.getFromHttpContext(context)
      : this.getFromGqlContext(context);
  }

  protected executeCommand(): Promise<boolean> {
    return Promise.reject(this.denial);
  }
}

type TestRequest = {
  user: IOptionalAuthUser;
  params: TestParams;
} & RequestWithRejectedCredentials;

function makeRequest(user?: IAuthUser): TestRequest {
  return { user, params: { projectId: 'project-1' } };
}

function httpContext(request: object): ExecutionContext {
  return {
    getClass: () => ({}),
    getHandler: () => ({}),
    switchToHttp: () => ({ getRequest: () => request }),
  } as unknown as ExecutionContext;
}

function gqlContext(request: object): ExecutionContext {
  (GqlExecutionContext.create as jest.Mock).mockReturnValue({
    getContext: () => ({ req: request }),
    getArgs: () => ({ data: { projectId: 'project-1' } }),
  });
  return {
    getClass: () => ({}),
    getHandler: () => ({}),
  } as unknown as ExecutionContext;
}

describe('BasePermissionGuard denial code', () => {
  const transports = [
    ['http', httpContext],
    ['gql', gqlContext],
  ] as const;

  let reflector: jest.Mocked<Reflector>;
  let authApi: jest.Mocked<AuthApiService>;
  let scopeService: jest.Mocked<ApiKeyScopeService>;
  let casl: jest.Mocked<CaslAbilityFactory>;

  const buildGuard = (transport: 'http' | 'gql', denial: unknown) =>
    new DeniedGuard(transport, denial, reflector, authApi, scopeService, casl);

  beforeEach(() => {
    reflector = {
      get: jest.fn().mockReturnValue({
        action: PermissionAction.read,
        subject: PermissionSubject.Project,
      }),
    } as unknown as jest.Mocked<Reflector>;
    authApi = {} as jest.Mocked<AuthApiService>;
    scopeService = {
      validateScope: jest.fn().mockReturnValue(true),
    } as unknown as jest.Mocked<ApiKeyScopeService>;
    casl = {} as jest.Mocked<CaslAbilityFactory>;
  });

  describe.each(transports)('over %s', (transport, makeContext) => {
    it('answers 401 when the request presented credentials that were rejected', async () => {
      const request = makeRequest();
      markRejectedCredentials(request);

      const guard = buildGuard(transport, new Error('Permission denied'));

      await expect(guard.canActivate(makeContext(request))).rejects.toThrow(
        UnauthorizedException,
      );
    });

    it('answers 403 when the request presented no credentials at all', async () => {
      const request = makeRequest();

      const guard = buildGuard(transport, new Error('Permission denied'));

      await expect(guard.canActivate(makeContext(request))).rejects.toThrow(
        ForbiddenException,
      );
    });

    /**
     * The invariant that keeps the change narrow: a caller whose credentials
     * did materialise into a user is missing rights, not authentication.
     */
    it('answers 403 for an authenticated caller without the right permissions', async () => {
      const user: IAuthUser = {
        userId: 'api-key-user',
        email: '',
        authMethod: 'personal_key',
        apiKeyId: 'key-1',
      };
      const request = makeRequest(user);

      const guard = buildGuard(transport, new Error('Permission denied'));

      await expect(guard.canActivate(makeContext(request))).rejects.toThrow(
        ForbiddenException,
      );
    });

    it('keeps propagating NotFoundException for rejected credentials', async () => {
      const request = makeRequest();
      markRejectedCredentials(request);

      const guard = buildGuard(
        transport,
        new NotFoundException('Revision not found'),
      );

      await expect(guard.canActivate(makeContext(request))).rejects.toThrow(
        NotFoundException,
      );
    });

    it('reports 401 as Unauthorized instead of leaking the permission message', async () => {
      const request = makeRequest();
      markRejectedCredentials(request);

      const guard = buildGuard(
        transport,
        new Error('You are not allowed to read on Project'),
      );

      await expect(guard.canActivate(makeContext(request))).rejects.toThrow(
        new UnauthorizedException(),
      );
    });
  });
});
