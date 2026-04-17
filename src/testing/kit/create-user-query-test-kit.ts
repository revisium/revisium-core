import { CqrsModule, QueryBus } from '@nestjs/cqrs';
import { Test, type TestingModule } from '@nestjs/testing';
import { AdminUserHandler } from 'src/features/user/queries/handlers/admin-user.handler';
import { GetProjectsByUserIdHandler } from 'src/features/user/queries/handlers/get-projects-by-user-id.handler';
import { GetUserHandler } from 'src/features/user/queries/handlers/get-user.handler';
import { SearchUsersHandler } from 'src/features/user/queries/handlers/search-users.handler';
import { PrismaService } from 'src/infrastructure/database/prisma.service';

export interface UserQueryTestKit {
  module: TestingModule;
  prismaService: PrismaService;
  queryBus: QueryBus;
  close(): Promise<void>;
}

export async function createUserQueryTestKit(): Promise<UserQueryTestKit> {
  const module = await Test.createTestingModule({
    imports: [CqrsModule],
    providers: [
      PrismaService,
      AdminUserHandler,
      GetProjectsByUserIdHandler,
      GetUserHandler,
      SearchUsersHandler,
    ],
  }).compile();

  await module.init();

  return {
    module,
    prismaService: module.get(PrismaService),
    queryBus: module.get(QueryBus),
    async close() {
      await module.close();
    },
  };
}
