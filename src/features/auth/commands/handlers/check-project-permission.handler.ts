import { ForbiddenError, subject } from '@casl/ability';
import {
  InternalServerErrorException,
  NotFoundException,
} from '@nestjs/common';
import { CommandHandler, ICommandHandler } from '@nestjs/cqrs';
import { CaslAbilityFactory } from 'src/features/auth/casl-ability.factory';
import {
  CheckProjectPermissionCommand,
  CheckProjectPermissionCommandReturnType,
} from 'src/features/auth/commands/impl';
import { PermissionSubject, UserRole } from 'src/features/auth/consts';
import { getUserRole } from 'src/features/auth/utils';
import { PrismaService } from 'src/infrastructure/database/prisma.service';

@CommandHandler(CheckProjectPermissionCommand)
export class CheckProjectPermissionHandler implements ICommandHandler<
  CheckProjectPermissionCommand,
  CheckProjectPermissionCommandReturnType
> {
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
          isDeleted: false,
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
    } else if ('projectId' in data) {
      return this.getProjectByProjectId(data.projectId);
    }

    throw new InternalServerErrorException(`Invalid data=${data}`);
  }

  private async getProjectByProjectName(
    organizationId: string,
    projectName: string,
  ) {
    const project = await this.prisma.project.findFirst({
      where: { organizationId, name: projectName, isDeleted: false },
    });

    if (!project) {
      throw new NotFoundException('Project not found');
    }

    return project;
  }

  private async getProjectByEndpointId(endpointId: string) {
    const endpoint = await this.prisma.endpoint.findUnique({
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

    if (!endpoint || endpoint.revision.branch.project.isDeleted) {
      throw new NotFoundException('Endpoint not found');
    }

    return endpoint.revision.branch.project;
  }

  private async getProjectByRevisionId(revisionId: string) {
    const revision = await this.prisma.revision.findUnique({
      where: { id: revisionId },
      select: {
        branch: {
          select: {
            project: true,
          },
        },
      },
    });

    if (!revision || revision.branch.project.isDeleted) {
      throw new NotFoundException('Revision not found');
    }

    return revision.branch.project;
  }

  private async getProjectByProjectId(projectId: string) {
    const project = await this.prisma.project.findFirst({
      where: { id: projectId, isDeleted: false },
    });

    if (!project) {
      throw new NotFoundException('Project not found');
    }

    return project;
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
