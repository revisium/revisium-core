import { Injectable } from '@nestjs/common';
import { CommandBus } from '@nestjs/cqrs';
import { AuthService } from 'src/features/auth/auth.service';
import {
  CheckOrganizationPermissionCommand,
  CheckOrganizationPermissionCommandData,
  CheckOrganizationPermissionCommandReturnType,
  CheckProjectPermissionCommand,
  CheckProjectPermissionCommandData,
  CheckProjectPermissionCommandReturnType,
  CheckSystemPermissionCommand,
  CheckSystemPermissionCommandData,
  CheckSystemPermissionCommandReturnType,
  ConfirmEmailCodeCommand,
  ConfirmEmailCodeCommandData,
  ConfirmEmailCodeCommandReturnType,
  CreateUserCommand,
  CreateUserCommandData,
  CreateUserCommandReturnType,
  LoginCommand,
  LoginCommandData,
  LoginCommandReturnType,
  LoginGithubCommand,
  LoginGithubCommandData,
  LoginGithubCommandReturnType,
  LoginGoogleCommand,
  LoginGoogleCommandData,
  LoginGoogleCommandReturnType,
  SignUpCommand,
  SignUpCommandData,
  SignUpCommandReturnType,
} from 'src/features/auth/commands/impl';
import { AuthCacheService } from 'src/infrastructure/cache/services/auth-cache.service';
import { PrismaService } from 'src/infrastructure/database/prisma.service';

type ProjectIdentity = { organizationId: string; projectName: string };

@Injectable()
export class AuthApiService {
  constructor(
    private readonly commandBus: CommandBus,
    private readonly authCache: AuthCacheService,
    private readonly authService: AuthService,
    private readonly prisma: PrismaService,
  ) {}

  public issueAccessTokenForUserId(userId: string) {
    return this.authService.issueAccessTokenForUserId(userId);
  }

  public checkSystemPermission(data: CheckSystemPermissionCommandData) {
    return this.authCache.systemPermissionCheck(data, () => {
      return this.commandBus.execute<
        CheckSystemPermissionCommand,
        CheckSystemPermissionCommandReturnType
      >(new CheckSystemPermissionCommand(data));
    });
  }

  public checkOrganizationPermission(
    data: CheckOrganizationPermissionCommandData,
  ) {
    return this.authCache.organizationPermissionCheck(data, () => {
      return this.commandBus.execute<
        CheckOrganizationPermissionCommand,
        CheckOrganizationPermissionCommandReturnType
      >(new CheckOrganizationPermissionCommand(data));
    });
  }

  public async checkProjectPermission(data: CheckProjectPermissionCommandData) {
    const resolvedProject = await this.resolveProjectIdentity(data);

    return this.authCache.projectPermissionCheck(data, resolvedProject, () => {
      return this.commandBus.execute<
        CheckProjectPermissionCommand,
        CheckProjectPermissionCommandReturnType
      >(new CheckProjectPermissionCommand(data));
    });
  }

  private async resolveProjectIdentity(
    data: CheckProjectPermissionCommandData,
  ): Promise<ProjectIdentity | undefined> {
    if ('organizationId' in data && 'projectName' in data) {
      return {
        organizationId: data.organizationId,
        projectName: data.projectName,
      };
    }

    if ('revisionId' in data) {
      return this.authCache.projectIdentity(
        { revisionId: data.revisionId },
        () => this.queryProjectIdentityByRevision(data.revisionId),
      );
    }

    if ('endpointId' in data) {
      return this.authCache.projectIdentity(
        { endpointId: data.endpointId },
        () => this.queryProjectIdentityByEndpoint(data.endpointId),
      );
    }

    if ('projectId' in data) {
      return this.authCache.projectIdentity({ projectId: data.projectId }, () =>
        this.queryProjectIdentityByProjectId(data.projectId),
      );
    }

    return undefined;
  }

  private async queryProjectIdentityByRevision(
    revisionId: string,
  ): Promise<ProjectIdentity | undefined> {
    const revision = await this.prisma.revision.findUnique({
      where: { id: revisionId },
      select: {
        branch: {
          select: {
            project: {
              select: { organizationId: true, name: true },
            },
          },
        },
      },
    });
    if (!revision) {
      return undefined;
    }
    return {
      organizationId: revision.branch.project.organizationId,
      projectName: revision.branch.project.name,
    };
  }

  private async queryProjectIdentityByEndpoint(
    endpointId: string,
  ): Promise<ProjectIdentity | undefined> {
    const endpoint = await this.prisma.endpoint.findUnique({
      where: { id: endpointId },
      select: {
        revision: {
          select: {
            branch: {
              select: {
                project: {
                  select: { organizationId: true, name: true },
                },
              },
            },
          },
        },
      },
    });
    if (!endpoint) {
      return undefined;
    }
    return {
      organizationId: endpoint.revision.branch.project.organizationId,
      projectName: endpoint.revision.branch.project.name,
    };
  }

  private async queryProjectIdentityByProjectId(
    projectId: string,
  ): Promise<ProjectIdentity | undefined> {
    const project = await this.prisma.project.findUnique({
      where: { id: projectId },
      select: { organizationId: true, name: true },
    });
    if (!project) {
      return undefined;
    }
    return {
      organizationId: project.organizationId,
      projectName: project.name,
    };
  }

  public login(data: LoginCommandData): Promise<LoginCommandReturnType> {
    return this.commandBus.execute<LoginCommand, LoginCommandReturnType>(
      new LoginCommand(data),
    );
  }

  public loginGoogle(
    data: LoginGoogleCommandData,
  ): Promise<LoginGoogleCommandReturnType> {
    return this.commandBus.execute<
      LoginGoogleCommand,
      LoginGoogleCommandReturnType
    >(new LoginGoogleCommand(data));
  }

  public loginGithub(
    data: LoginGithubCommandData,
  ): Promise<LoginGithubCommandReturnType> {
    return this.commandBus.execute<
      LoginGithubCommand,
      LoginGithubCommandReturnType
    >(new LoginGithubCommand(data));
  }

  public createUser(data: CreateUserCommandData) {
    return this.commandBus.execute<
      CreateUserCommand,
      CreateUserCommandReturnType
    >(new CreateUserCommand(data));
  }

  public signUp(data: SignUpCommandData) {
    return this.commandBus.execute<SignUpCommand, SignUpCommandReturnType>(
      new SignUpCommand(data),
    );
  }

  public confirmEmailCode(data: ConfirmEmailCodeCommandData) {
    return this.commandBus.execute<
      ConfirmEmailCodeCommand,
      ConfirmEmailCodeCommandReturnType
    >(new ConfirmEmailCodeCommand(data));
  }
}
