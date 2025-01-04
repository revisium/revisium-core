import { ForbiddenError, subject } from '@casl/ability';
import { InternalServerErrorException } from '@nestjs/common';
import { CommandHandler, ICommandHandler } from '@nestjs/cqrs';
import { CaslAbilityFactory } from 'src/features/auth/casl-ability.factory';
import { CheckProjectPermissionCommand } from 'src/features/auth/commands/impl';
import { PermissionSubject, UserRole } from 'src/features/auth/consts';
import { getUserRole } from 'src/features/auth/utils';
import { PrismaService } from 'src/infrastructure/database/prisma.service';

@CommandHandler(CheckProjectPermissionCommand)
export class CheckProjectPermissionHandler
  implements ICommandHandler<CheckProjectPermissionCommand, true>
{
  constructor(
    private readonly prisma: PrismaService,
    private readonly casl: CaslAbilityFactory,
  ) {}

  async execute({ data }: CheckProjectPermissionCommand): Promise<true> {
    const project = await this.resolveProject(data);

    const systemRole = await this.getSystemRole(data);

    const organizationRole = await this.getOrganizationRole({
      organizationId: project.organizationId,
      userId: data.userId,
    });

    const projectRole = await this.getProjectRole({
      organizationId: project.organizationId,
      projectName: project.name,
      userId: data.userId,
    });

    const ability = await this.casl.createAbility(
      systemRole,
      organizationRole,
      projectRole,
    );

    for (const permission of data.permissions) {
      ForbiddenError.from(ability)
        .setMessage(
          `You are not allowed to ${permission.action} on ${permission.subject}`,
        )
        .throwUnlessCan(
          permission.action,
          permission.subject === PermissionSubject.Project
            ? subject(PermissionSubject.Project, project)
            : permission.subject,
        );
    }

    return true;
  }

  private async getOrganizationRole(params: {
    organizationId: string;
    userId?: string;
  }): Promise<UserRole> {
    if (params.userId) {
      const result = await this.prisma.userOrganization.findFirst({
        where: { organizationId: params.organizationId, userId: params.userId },
        select: {
          roleId: true,
        },
      });

      return getUserRole(result?.roleId);
    }

    return UserRole.guest;
  }

  private async getProjectRole(params: {
    organizationId: string;
    projectName: string;
    userId?: string;
  }): Promise<UserRole> {
    if (params.userId) {
      const project = await this.prisma.project.findFirst({
        where: {
          organizationId: params.organizationId,
          name: params.projectName,
        },
        select: {
          id: true,
        },
      });

      if (!project) {
        return UserRole.guest;
      }

      const result = await this.prisma.userProject.findFirst({
        where: { projectId: project.id, userId: params.userId },
        select: {
          roleId: true,
        },
      });

      return getUserRole(result?.roleId);
    }

    return UserRole.guest;
  }

  private async resolveProject(data: CheckProjectPermissionCommand['data']) {
    if ('organizationId' in data && 'projectName' in data) {
      return this.getProjectByProjectName(
        data.organizationId,
        data.projectName,
      );
    } else if ('revisionId' in data) {
      return this.getProjectByRevisionId(data.revisionId);
    } else if ('endpointId' in data) {
      return this.getProjectByEndpointId(data.endpointId);
    }

    throw new InternalServerErrorException(`Invalid data=${data}`);
  }

  private async getProjectByProjectName(
    organizationId: string,
    projectName: string,
  ) {
    return this.prisma.project.findFirstOrThrow({
      where: { organizationId, name: projectName },
    });
  }

  private async getProjectByEndpointId(endpointId: string) {
    const revision = await this.prisma.endpoint.findUniqueOrThrow({
      where: { id: endpointId },
      select: {
        revision: {
          select: {
            branch: {
              select: {
                project: true,
              },
            },
          },
        },
      },
    });

    return revision.revision.branch.project;
  }

  private async getProjectByRevisionId(revisionId: string) {
    const revision = await this.prisma.revision.findUniqueOrThrow({
      where: { id: revisionId },
      select: {
        branch: {
          select: {
            project: true,
          },
        },
      },
    });

    return revision.branch.project;
  }

  private async getSystemRole(
    data: CheckProjectPermissionCommand['data'],
  ): Promise<UserRole> {
    if (data.userId) {
      const result = await this.prisma.user.findUnique({
        where: { id: data.userId },
        select: {
          roleId: true,
        },
      });

      return getUserRole(result?.roleId);
    }

    return UserRole.guest;
  }
}
