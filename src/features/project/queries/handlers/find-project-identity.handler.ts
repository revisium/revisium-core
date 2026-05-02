import { IQueryHandler, QueryHandler } from '@nestjs/cqrs';
import { PrismaService } from 'src/infrastructure/database/prisma.service';
import {
  FindProjectIdentityQuery,
  FindProjectIdentityQueryReturnType,
} from 'src/features/project/queries/impl';

@QueryHandler(FindProjectIdentityQuery)
export class FindProjectIdentityHandler implements IQueryHandler<
  FindProjectIdentityQuery,
  FindProjectIdentityQueryReturnType
> {
  constructor(private readonly prisma: PrismaService) {}

  public execute({
    data,
  }: FindProjectIdentityQuery): Promise<FindProjectIdentityQueryReturnType> {
    if (data.organizationId && data.projectName) {
      return this.byOrganizationAndName(data.organizationId, data.projectName);
    }
    if (data.projectId) {
      return this.byProjectId(data.projectId);
    }
    if (data.revisionId) {
      return this.byRevisionId(data.revisionId);
    }
    if (data.endpointId) {
      return this.byEndpointId(data.endpointId);
    }
    return Promise.resolve(null);
  }

  private async byOrganizationAndName(
    organizationId: string,
    projectName: string,
  ): Promise<FindProjectIdentityQueryReturnType> {
    const project = await this.prisma.project.findFirst({
      where: { organizationId, name: projectName, isDeleted: false },
      select: { organizationId: true, name: true },
    });
    return project
      ? { organizationId: project.organizationId, projectName: project.name }
      : null;
  }

  private async byProjectId(
    projectId: string,
  ): Promise<FindProjectIdentityQueryReturnType> {
    const project = await this.prisma.project.findFirst({
      where: { id: projectId, isDeleted: false },
      select: { organizationId: true, name: true },
    });
    return project
      ? { organizationId: project.organizationId, projectName: project.name }
      : null;
  }

  private async byRevisionId(
    revisionId: string,
  ): Promise<FindProjectIdentityQueryReturnType> {
    const revision = await this.prisma.revision.findUnique({
      where: { id: revisionId },
      select: {
        branch: {
          select: {
            project: {
              select: {
                organizationId: true,
                name: true,
                isDeleted: true,
              },
            },
          },
        },
      },
    });
    if (!revision || revision.branch.project.isDeleted) {
      return null;
    }
    return {
      organizationId: revision.branch.project.organizationId,
      projectName: revision.branch.project.name,
    };
  }

  private async byEndpointId(
    endpointId: string,
  ): Promise<FindProjectIdentityQueryReturnType> {
    const endpoint = await this.prisma.endpoint.findUnique({
      where: { id: endpointId },
      select: {
        revision: {
          select: {
            branch: {
              select: {
                project: {
                  select: {
                    organizationId: true,
                    name: true,
                    isDeleted: true,
                  },
                },
              },
            },
          },
        },
      },
    });
    if (!endpoint || endpoint.revision.branch.project.isDeleted) {
      return null;
    }
    return {
      organizationId: endpoint.revision.branch.project.organizationId,
      projectName: endpoint.revision.branch.project.name,
    };
  }
}
