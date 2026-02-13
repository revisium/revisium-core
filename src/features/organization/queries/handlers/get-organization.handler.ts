import { IQueryHandler, QueryHandler } from '@nestjs/cqrs';
import { PrismaService } from 'src/infrastructure/database/prisma.service';
import {
  GetOrganizationQuery,
  GetOrganizationQueryReturnType,
} from 'src/features/organization/queries/impl/get-organization.query';

@QueryHandler(GetOrganizationQuery)
export class GetOrganizationHandler implements IQueryHandler<
  GetOrganizationQuery,
  GetOrganizationQueryReturnType
> {
  constructor(private readonly prisma: PrismaService) {}

  public async execute({ data }: GetOrganizationQuery) {
    return this.prisma.organization.findUniqueOrThrow({
      where: {
        id: data.organizationId,
      },
    });
  }
}
