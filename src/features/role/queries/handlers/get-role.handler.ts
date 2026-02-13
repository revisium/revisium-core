import { IQueryHandler, QueryHandler } from '@nestjs/cqrs';
import { PrismaService } from 'src/infrastructure/database/prisma.service';
import {
  GetRoleQuery,
  GetRoleQueryReturnType,
} from 'src/features/role/queries/impl/get-role.query';

@QueryHandler(GetRoleQuery)
export class GetRoleHandler implements IQueryHandler<
  GetRoleQuery,
  GetRoleQueryReturnType
> {
  constructor(private readonly prisma: PrismaService) {}

  public async execute({ data }: GetRoleQuery) {
    return this.prisma.role.findUniqueOrThrow({
      where: {
        id: data.roleId,
      },
    });
  }
}
