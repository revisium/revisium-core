import { NotFoundException } from '@nestjs/common';
import { IQueryHandler, QueryHandler } from '@nestjs/cqrs';
import {
  GetEndpointRelativesQuery,
  GetEndpointRelativesQueryReturnType,
} from 'src/features/endpoint/queries/impl';
import { PrismaService } from 'src/infrastructure/database/prisma.service';

@QueryHandler(GetEndpointRelativesQuery)
export class GetEndpointRelativesHandler implements IQueryHandler<
  GetEndpointRelativesQuery,
  GetEndpointRelativesQueryReturnType
> {
  constructor(private readonly prisma: PrismaService) {}

  public async execute({ data }: GetEndpointRelativesQuery) {
    const result = await this.getRelatives(data.endpointId);

    if (!result) {
      throw new NotFoundException('No endpoint found.');
    }

    const { revision: revisionResult, ...endpoint } = result;
    const { branch: branchResult, ...revision } = revisionResult;
    const { project, ...branch } = branchResult;

    return {
      endpoint,
      revision,
      branch,
      project,
    };
  }

  private getRelatives(endpointId: string) {
    return this.prisma.endpoint.findUnique({
      where: { id: endpointId },
      include: {
        revision: {
          include: {
            branch: {
              include: {
                project: true,
              },
            },
          },
        },
      },
    });
  }
}
