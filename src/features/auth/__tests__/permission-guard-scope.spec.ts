import {
  ExecutionContext,
  ForbiddenException,
  InternalServerErrorException,
  NotFoundException,
} from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import { ApiKeyScopeService } from 'src/features/api-key/api-key-scope.service';
import { AuthApiService } from 'src/features/auth/commands/auth-api.service';
import { BasePermissionGuard } from 'src/features/auth/guards/base-persmission.guard';
import {
  IPermissionParams,
  PERMISSION_PARAMS_KEY,
} from 'src/features/auth/guards/permission-params';
import { PermissionAction, PermissionSubject } from 'src/features/auth/consts';
import { IOptionalAuthUser } from 'src/features/auth/types';

interface TestParams {
  organizationId?: string;
  projectId?: string;
  branchName?: string;
  tableId?: string;
}

class TestPermissionGuard extends BasePermissionGuard<TestParams> {
  private testUser: IOptionalAuthUser;
  private testParams: TestParams;

  setTestData(user: IOptionalAuthUser, params: TestParams) {
    this.testUser = user;
    this.testParams = params;
  }

  protected getParams(_context: ExecutionContext) {
    return {
      user: this.testUser,
      params: this.testParams,
    };
  }

  protected executeCommand(
    _params: TestParams,
    _permissions: IPermissionParams[],
    _userId?: string,
  ) {
    return Promise.resolve(true);
  }

  protected override buildScopeRequest(params: TestParams) {
    return {
      organizationId: params.organizationId,
      projectId: params.projectId,
      branchName: params.branchName,
      tableId: params.tableId,
    };
  }
}

describe('BasePermissionGuard scope validation', () => {
  let guard: TestPermissionGuard;
  let reflector: jest.Mocked<Reflector>;
  let authApi: jest.Mocked<AuthApiService>;
  let scopeService: jest.Mocked<ApiKeyScopeService>;

  const defaultPermission: IPermissionParams = {
    action: PermissionAction.read,
    subject: PermissionSubject.Project,
  };

  const createContext = (): ExecutionContext => {
    return {
      getClass: () => ({}),
      getHandler: () => ({}),
    } as unknown as ExecutionContext;
  };

  beforeEach(() => {
    reflector = {
      get: jest.fn().mockImplementation((key: string, _target: any) => {
        if (key === PERMISSION_PARAMS_KEY) {
          return defaultPermission;
        }
        return undefined;
      }),
    } as any;

    authApi = {
      checkProjectPermission: jest.fn().mockResolvedValue(true),
    } as any;

    scopeService = {
      validateScope: jest.fn().mockReturnValue(true),
      resolveBranchNames: jest.fn().mockResolvedValue(['master']),
    } as any;

    guard = new TestPermissionGuard(reflector, authApi, scopeService);
  });

  it('should skip scope validation for JWT users (no apiKeyId)', async () => {
    guard.setTestData(
      { userId: 'user-1', email: 'u@t.com' },
      { organizationId: 'org-1', projectId: 'proj-1' },
    );

    const result = await guard.canActivate(createContext());

    expect(result).toBe(true);
    expect(scopeService.validateScope).not.toHaveBeenCalled();
  });

  it('should skip scope validation when user has apiKeyId but no apiKeyScope', async () => {
    guard.setTestData(
      {
        userId: 'user-1',
        email: '',
        apiKeyId: 'key-1',
        authMethod: 'personal_key',
      },
      { organizationId: 'org-1' },
    );

    const result = await guard.canActivate(createContext());

    expect(result).toBe(true);
    expect(scopeService.validateScope).not.toHaveBeenCalled();
  });

  it('should validate scope when user has apiKeyId and apiKeyScope', async () => {
    guard.setTestData(
      {
        userId: 'user-1',
        email: '',
        apiKeyId: 'key-1',
        authMethod: 'personal_key',
        apiKeyScope: {
          organizationId: 'org-1',
          projectIds: ['proj-1'],
          branchNames: [],
          tableIds: [],
        },
      },
      { organizationId: 'org-1', projectId: 'proj-1' },
    );

    const result = await guard.canActivate(createContext());

    expect(result).toBe(true);
    expect(scopeService.validateScope).toHaveBeenCalled();
  });

  it('should throw ForbiddenException when scope validation fails', async () => {
    scopeService.validateScope.mockReturnValue(false);

    guard.setTestData(
      {
        userId: 'user-1',
        email: '',
        apiKeyId: 'key-1',
        authMethod: 'personal_key',
        apiKeyScope: {
          organizationId: 'org-1',
          projectIds: ['proj-1'],
          branchNames: [],
          tableIds: [],
        },
      },
      { organizationId: 'org-2' },
    );

    await expect(guard.canActivate(createContext())).rejects.toThrow(
      ForbiddenException,
    );
  });

  it('should resolve branch names when branchNames and projectId are present', async () => {
    guard.setTestData(
      {
        userId: 'user-1',
        email: '',
        apiKeyId: 'key-1',
        authMethod: 'personal_key',
        apiKeyScope: {
          organizationId: null,
          projectIds: [],
          branchNames: ['$default'],
          tableIds: [],
        },
      },
      { projectId: 'proj-1', branchName: 'master' },
    );

    await guard.canActivate(createContext());

    expect(scopeService.resolveBranchNames).toHaveBeenCalledWith(
      ['$default'],
      'proj-1',
    );
  });

  it('should not resolve branch names when branchNames is empty', async () => {
    guard.setTestData(
      {
        userId: 'user-1',
        email: '',
        apiKeyId: 'key-1',
        authMethod: 'personal_key',
        apiKeyScope: {
          organizationId: null,
          projectIds: [],
          branchNames: [],
          tableIds: [],
        },
      },
      { projectId: 'proj-1', branchName: 'master' },
    );

    await guard.canActivate(createContext());

    expect(scopeService.resolveBranchNames).not.toHaveBeenCalled();
  });

  it('should pass scope request with all available params', async () => {
    const scope = {
      organizationId: 'org-1',
      projectIds: ['proj-1'],
      branchNames: [],
      tableIds: ['posts'],
    };

    guard.setTestData(
      {
        userId: 'user-1',
        email: '',
        apiKeyId: 'key-1',
        authMethod: 'personal_key',
        apiKeyScope: scope,
      },
      {
        organizationId: 'org-1',
        projectId: 'proj-1',
        branchName: 'master',
        tableId: 'posts',
      },
    );

    await guard.canActivate(createContext());

    expect(scopeService.validateScope).toHaveBeenCalledWith(
      expect.objectContaining({
        organizationId: 'org-1',
        projectIds: ['proj-1'],
        branchNames: [],
        tableIds: ['posts'],
      }),
      {
        organizationId: 'org-1',
        projectId: 'proj-1',
        branchName: 'master',
        tableId: 'posts',
      },
      undefined,
    );
  });

  it('should allow optional user (anonymous) without scope check', async () => {
    guard.setTestData(undefined, { organizationId: 'org-1' });

    const result = await guard.canActivate(createContext());

    expect(result).toBe(true);
    expect(scopeService.validateScope).not.toHaveBeenCalled();
  });
});

describe('BasePermissionGuard error handling', () => {
  let reflector: jest.Mocked<Reflector>;
  let authApi: jest.Mocked<AuthApiService>;
  let scopeService: jest.Mocked<ApiKeyScopeService>;
  let guard: TestPermissionGuard;

  beforeEach(() => {
    reflector = {
      get: jest.fn().mockReturnValue({
        action: PermissionAction.read,
        subject: PermissionSubject.Project,
      }),
    } as any;
    authApi = {} as any;
    scopeService = { validateScope: jest.fn() } as any;
    guard = new TestPermissionGuard(reflector, authApi, scopeService);
  });

  it('should throw NotFoundException when params are null', async () => {
    guard.setTestData({ userId: 'u1', email: '' }, null as any);

    const context = {
      getClass: () => ({}),
      getHandler: () => ({}),
    } as unknown as ExecutionContext;

    await expect(guard.canActivate(context)).rejects.toThrow(NotFoundException);
  });

  it('should rethrow NotFoundException from executeCommand', async () => {
    class FailGuard extends BasePermissionGuard<TestParams> {
      protected getParams(_context: ExecutionContext) {
        return {
          user: { userId: 'u1', email: '' },
          params: { organizationId: 'org-1' } as TestParams,
        };
      }
      protected async executeCommand(): Promise<boolean> {
        throw new NotFoundException('Resource not found');
      }
    }
    const g = new FailGuard(reflector, authApi, scopeService);
    const ctx = {
      getClass: () => ({}),
      getHandler: () => ({}),
    } as unknown as ExecutionContext;

    await expect(g.canActivate(ctx)).rejects.toThrow(NotFoundException);
  });

  it('should wrap generic errors as ForbiddenException', async () => {
    class FailGuard extends BasePermissionGuard<TestParams> {
      protected getParams(_context: ExecutionContext) {
        return {
          user: { userId: 'u1', email: '' },
          params: { organizationId: 'org-1' } as TestParams,
        };
      }
      protected async executeCommand(): Promise<boolean> {
        throw new Error('Permission denied');
      }
    }
    const g = new FailGuard(reflector, authApi, scopeService);
    const ctx = {
      getClass: () => ({}),
      getHandler: () => ({}),
    } as unknown as ExecutionContext;

    await expect(g.canActivate(ctx)).rejects.toThrow(ForbiddenException);
  });

  it('should throw InternalServerErrorException for non-Error throws', async () => {
    class FailGuard extends BasePermissionGuard<TestParams> {
      protected getParams(_context: ExecutionContext) {
        return {
          user: { userId: 'u1', email: '' },
          params: { organizationId: 'org-1' } as TestParams,
        };
      }
      protected async executeCommand(): Promise<boolean> {
        throw 'string error';
      }
    }
    const g = new FailGuard(reflector, authApi, scopeService);
    const ctx = {
      getClass: () => ({}),
      getHandler: () => ({}),
    } as unknown as ExecutionContext;

    await expect(g.canActivate(ctx)).rejects.toThrow(
      InternalServerErrorException,
    );
  });

  it('should merge class and method permission params', async () => {
    class TrackGuard extends BasePermissionGuard<TestParams> {
      public capturedPermissions: IPermissionParams[] = [];
      protected getParams(_context: ExecutionContext) {
        return {
          user: { userId: 'u1', email: '' },
          params: { organizationId: 'org-1' } as TestParams,
        };
      }
      protected executeCommand(
        _params: TestParams,
        permissions: IPermissionParams[],
      ) {
        this.capturedPermissions = permissions;
        return Promise.resolve(true);
      }
    }

    const classPermission = {
      action: PermissionAction.read,
      subject: PermissionSubject.Project,
    };
    const methodPermission = {
      action: PermissionAction.update,
      subject: PermissionSubject.Row,
    };

    const classObj = {};
    const handlerObj = {};
    const mockReflector = {
      get: jest.fn().mockImplementation((key: string, target: any) => {
        if (target === classObj) return classPermission;
        if (target === handlerObj) return methodPermission;
        return undefined;
      }),
    } as any;

    const g = new TrackGuard(mockReflector, authApi, scopeService);
    const ctx = {
      getClass: () => classObj,
      getHandler: () => handlerObj,
    } as unknown as ExecutionContext;

    await g.canActivate(ctx);

    expect(g.capturedPermissions).toHaveLength(2);
    expect(g.capturedPermissions[0]).toBe(classPermission);
    expect(g.capturedPermissions[1]).toBe(methodPermission);
  });
});

describe('BasePermissionGuard internal key bypass', () => {
  let reflector: jest.Mocked<Reflector>;
  let authApi: jest.Mocked<AuthApiService>;
  let scopeService: jest.Mocked<ApiKeyScopeService>;

  const defaultPermission: IPermissionParams = {
    action: PermissionAction.read,
    subject: PermissionSubject.Project,
  };

  const createContext = (): ExecutionContext => {
    return {
      getClass: () => ({}),
      getHandler: () => ({}),
    } as unknown as ExecutionContext;
  };

  beforeEach(() => {
    reflector = {
      get: jest.fn().mockImplementation((key: string) => {
        if (key === PERMISSION_PARAMS_KEY) {
          return defaultPermission;
        }
        return undefined;
      }),
    } as any;
    authApi = {
      checkProjectPermission: jest.fn().mockResolvedValue(true),
    } as any;
    scopeService = {
      validateScope: jest.fn().mockReturnValue(true),
      resolveBranchNames: jest.fn().mockResolvedValue(['master']),
    } as any;
  });

  it('should skip executeCommand for internal_key authMethod', async () => {
    class TrackingGuard extends BasePermissionGuard<TestParams> {
      public executeCommandCalled = false;
      protected getParams(_context: ExecutionContext) {
        return {
          user: {
            userId: 'internal:endpoint',
            email: '',
            authMethod: 'internal_key' as const,
            apiKeyId: 'key-1',
          },
          params: { organizationId: 'org-1' } as TestParams,
        };
      }
      protected executeCommand() {
        this.executeCommandCalled = true;
        return Promise.resolve(true);
      }
    }

    const guard = new TrackingGuard(reflector, authApi, scopeService);
    const result = await guard.canActivate(createContext());

    expect(result).toBe(true);
    expect(guard.executeCommandCalled).toBe(false);
  });

  it('should skip scope validation for internal_key authMethod', async () => {
    class TrackingGuard extends BasePermissionGuard<TestParams> {
      protected getParams(_context: ExecutionContext) {
        return {
          user: {
            userId: 'internal:endpoint',
            email: '',
            authMethod: 'internal_key' as const,
            apiKeyId: 'key-1',
            apiKeyScope: {
              organizationId: 'org-1',
              projectIds: [],
              branchNames: [],
              tableIds: [],
            },
          },
          params: { organizationId: 'org-1' } as TestParams,
        };
      }
      protected executeCommand() {
        return Promise.resolve(true);
      }
      protected override buildScopeRequest(params: TestParams) {
        return {
          organizationId: params.organizationId,
        };
      }
    }

    const guard = new TrackingGuard(reflector, authApi, scopeService);
    const result = await guard.canActivate(createContext());

    expect(result).toBe(true);
    expect(scopeService.validateScope).not.toHaveBeenCalled();
  });

  it('should still call executeCommand for other authMethods', async () => {
    class TrackingGuard extends BasePermissionGuard<TestParams> {
      public executeCommandCalled = false;
      protected getParams(_context: ExecutionContext) {
        return {
          user: {
            userId: 'user-1',
            email: '',
            authMethod: 'personal_key' as const,
            apiKeyId: 'key-1',
          },
          params: { organizationId: 'org-1' } as TestParams,
        };
      }
      protected executeCommand() {
        this.executeCommandCalled = true;
        return Promise.resolve(true);
      }
    }

    const guard = new TrackingGuard(reflector, authApi, scopeService);
    await guard.canActivate(createContext());

    expect(guard.executeCommandCalled).toBe(true);
  });
});

describe('BasePermissionGuard without scope override', () => {
  class NoScopeGuard extends BasePermissionGuard<{ organizationId: string }> {
    private testUser: IOptionalAuthUser;
    private testParams: { organizationId: string };

    setTestData(user: IOptionalAuthUser, params: { organizationId: string }) {
      this.testUser = user;
      this.testParams = params;
    }

    protected getParams(_context: ExecutionContext) {
      return { user: this.testUser, params: this.testParams };
    }

    protected executeCommand() {
      return Promise.resolve(true);
    }
  }

  it('should skip scope validation when buildScopeRequest returns null', async () => {
    const reflector = {
      get: jest.fn().mockReturnValue({
        action: PermissionAction.read,
        subject: PermissionSubject.Organization,
      }),
    } as any;
    const authApi = {} as any;
    const scopeService = { validateScope: jest.fn() } as any;

    const guard = new NoScopeGuard(reflector, authApi, scopeService);
    guard.setTestData(
      {
        userId: 'u1',
        email: '',
        apiKeyId: 'key-1',
        authMethod: 'personal_key',
        apiKeyScope: {
          organizationId: 'org-1',
          projectIds: [],
          branchNames: [],
          tableIds: [],
        },
      },
      { organizationId: 'org-1' },
    );

    const context = {
      getClass: () => ({}),
      getHandler: () => ({}),
    } as unknown as ExecutionContext;

    await guard.canActivate(context);

    expect(scopeService.validateScope).not.toHaveBeenCalled();
  });
});
