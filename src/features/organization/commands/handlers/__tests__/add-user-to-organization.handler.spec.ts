import { Test, TestingModule } from '@nestjs/testing';
import { CommandBus, CqrsModule } from '@nestjs/cqrs';
import { BadRequestException } from '@nestjs/common';
import { nanoid } from 'nanoid';
import { BillingModule } from 'src/features/billing/billing.module';
import { LimitExceededException } from 'src/features/billing/limit-exceeded.exception';
import {
  LIMITS_SERVICE_TOKEN,
  ILimitsService,
  LimitMetric,
} from 'src/features/billing/limits.interface';
import { UserOrganizationRoles } from 'src/features/auth/consts';
import {
  AddUserToOrganizationCommand,
  AddUserToOrganizationCommandReturnType,
} from 'src/features/organization/commands/impl';
import { AddUserToOrganizationHandler } from '../add-user-to-organization.handler';
import { DatabaseModule } from 'src/infrastructure/database/database.module';
import { PrismaService } from 'src/infrastructure/database/prisma.service';

describe('AddUserToOrganizationHandler', () => {
  let module: TestingModule;
  let commandBus: CommandBus;
  let prisma: PrismaService;

  beforeAll(async () => {
    module = await Test.createTestingModule({
      imports: [DatabaseModule, CqrsModule, BillingModule],
      providers: [AddUserToOrganizationHandler],
    }).compile();

    await module.init();
    commandBus = module.get(CommandBus);
    prisma = module.get(PrismaService);
  });

  afterAll(async () => {
    await prisma.$disconnect();
  });

  const createOrg = async () => {
    const orgId = nanoid();
    await prisma.organization.create({
      data: { id: orgId, createdId: nanoid() },
    });
    return orgId;
  };

  const createUser = async () => {
    const userId = nanoid();
    await prisma.user.create({
      data: {
        id: userId,
        password: 'hash',
        role: { connect: { id: 'systemUser' } },
      },
    });
    return userId;
  };

  const execute = (data: AddUserToOrganizationCommand['data']) =>
    commandBus.execute<
      AddUserToOrganizationCommand,
      AddUserToOrganizationCommandReturnType
    >(new AddUserToOrganizationCommand(data));

  it('should add a new user to organization', async () => {
    const orgId = await createOrg();
    const userId = await createUser();

    const result = await execute({
      organizationId: orgId,
      userId,
      roleId: UserOrganizationRoles.developer,
    });

    expect(result).toBe(true);

    const membership = await prisma.userOrganization.findFirst({
      where: { userId, organizationId: orgId },
    });
    expect(membership).toBeDefined();
    expect(membership!.roleId).toBe(UserOrganizationRoles.developer);
  });

  it('should update role for existing user without creating duplicate', async () => {
    const orgId = await createOrg();
    const userId = await createUser();

    await execute({
      organizationId: orgId,
      userId,
      roleId: UserOrganizationRoles.developer,
    });

    await execute({
      organizationId: orgId,
      userId,
      roleId: UserOrganizationRoles.organizationAdmin,
    });

    const memberships = await prisma.userOrganization.findMany({
      where: { userId, organizationId: orgId },
    });
    expect(memberships).toHaveLength(1);
    expect(memberships[0].roleId).toBe(UserOrganizationRoles.organizationAdmin);
  });

  it('should throw on invalid role', async () => {
    const orgId = await createOrg();
    const userId = await createUser();

    await expect(
      execute({
        organizationId: orgId,
        userId,
        roleId: 'invalid' as any,
      }),
    ).rejects.toThrow(BadRequestException);
  });

  describe('with limit enforcement', () => {
    let limitedModule: TestingModule;
    let limitedCommandBus: CommandBus;
    let limitedPrisma: PrismaService;

    beforeAll(async () => {
      limitedModule = await Test.createTestingModule({
        imports: [DatabaseModule, CqrsModule],
        providers: [
          AddUserToOrganizationHandler,
          {
            provide: LIMITS_SERVICE_TOKEN,
            useValue: {
              checkLimit: async (
                _orgId: string,
                _metric: LimitMetric,
                _increment: number,
              ) => ({
                allowed: false,
                current: 10,
                limit: 10,
                metric: LimitMetric.SEATS,
              }),
            } satisfies ILimitsService,
          },
        ],
      }).compile();

      await limitedModule.init();
      limitedCommandBus = limitedModule.get(CommandBus);
      limitedPrisma = limitedModule.get(PrismaService);
    });

    afterAll(async () => {
      await limitedPrisma.$disconnect();
    });

    it('should throw LimitExceededException for new user when limit exceeded', async () => {
      const orgId = await createOrg();
      const userId = await createUser();

      await expect(
        limitedCommandBus.execute(
          new AddUserToOrganizationCommand({
            organizationId: orgId,
            userId,
            roleId: UserOrganizationRoles.developer,
          }),
        ),
      ).rejects.toThrow(LimitExceededException);
    });

    it('should NOT check limit when updating existing user role', async () => {
      const orgId = await createOrg();
      const userId = await createUser();

      // First add via main module (noop limits)
      await execute({
        organizationId: orgId,
        userId,
        roleId: UserOrganizationRoles.developer,
      });

      // Then update role via limited module — should NOT throw
      const result = await limitedCommandBus.execute(
        new AddUserToOrganizationCommand({
          organizationId: orgId,
          userId,
          roleId: UserOrganizationRoles.organizationAdmin,
        }),
      );
      expect(result).toBe(true);
    });
  });
});
