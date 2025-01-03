import { Test, TestingModule } from '@nestjs/testing';
import { PrismaService } from 'src/database/prisma.service';
import { GetUserOrganizationHandler } from '../get-user-organization.handler';
import { GetUserOrganizationQuery } from 'src/user/queries/impl';

describe('GetUserOrganizationHandler', () => {
  it('should return organizationId if user is an owner', async () => {
    const organizationId = 'organizationId';
    prismaService.userOrganization.findFirst = createMock({ organizationId });
    const query = createQuery();

    const result = await handler.execute(query);

    expect(result).toEqual(organizationId);
    expect(prismaService.userOrganization.findFirst).toHaveBeenCalledWith({
      where: {
        userId: 'userId',
        roleId: 'organizationOwner',
      },
      select: {
        organizationId: true,
      },
    });
  });

  it('should return undefined if user is not an owner', async () => {
    prismaService.userOrganization.findFirst = createMock(null);
    const query = createQuery();

    const result = await handler.execute(query);

    expect(result).toBeUndefined();
    expect(prismaService.userOrganization.findFirst).toHaveBeenCalledWith({
      where: {
        userId: 'userId',
        roleId: 'organizationOwner',
      },
      select: {
        organizationId: true,
      },
    });
  });

  let handler: GetUserOrganizationHandler;
  let prismaService: PrismaService;

  const createMock = <T>(mockResolvedValue: T) =>
    jest.fn().mockResolvedValue(mockResolvedValue);

  beforeEach(async () => {
    const prismaServiceMock = {
      userOrganization: {
        findFirst: createMock(null),
      },
    };

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        GetUserOrganizationHandler,
        { provide: PrismaService, useValue: prismaServiceMock },
      ],
    }).compile();

    handler = module.get<GetUserOrganizationHandler>(
      GetUserOrganizationHandler,
    );
    prismaService = module.get<PrismaService>(PrismaService);
  });

  const createQuery = (
    data: Partial<GetUserOrganizationQuery['data']> = {},
  ) => {
    return new GetUserOrganizationQuery({
      userId: 'userId',
      ...data,
    });
  };
});
