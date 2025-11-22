import { IQueryHandler, QueryHandler } from '@nestjs/cqrs';
import {
  GetUserOrganizationQuery,
  GetUserOrganizationQueryReturnType,
} from 'src/features/user/queries/impl';
import { PrismaService } from 'src/infrastructure/database/prisma.service';

@QueryHandler(GetUserOrganizationQuery)
export class GetUserOrganizationHandler
  implements
    IQueryHandler<GetUserOrganizationQuery, GetUserOrganizationQueryReturnType>
{
  constructor(private readonly prisma: PrismaService) {}

  public async execute({ data }: GetUserOrganizationQuery) {
    return this.prisma.userOrganization.findUnique({
      where: {
        organizationId_userId: {
          userId: data.userId,
          organizationId: data.organizationId,
        },
      },
    });
  }
}
