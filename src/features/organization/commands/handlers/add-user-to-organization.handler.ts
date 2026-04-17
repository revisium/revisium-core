import { BadRequestException, Inject } from '@nestjs/common';
import { CommandHandler, ICommandHandler } from '@nestjs/cqrs';
import {
  ILimitsService,
  LimitMetric,
  LIMITS_SERVICE_TOKEN,
} from 'src/features/billing/limits.interface';
import { LimitExceededException } from 'src/features/billing/limit-exceeded.exception';
import { isValidOrganizationRole } from 'src/features/auth/consts';
import { IdService } from '@revisium/engine';
import { PrismaService } from 'src/infrastructure/database/prisma.service';
import {
  AddUserToOrganizationCommand,
  AddUserToOrganizationCommandReturnType,
} from 'src/features/organization/commands/impl';

@CommandHandler(AddUserToOrganizationCommand)
export class AddUserToOrganizationHandler implements ICommandHandler<
  AddUserToOrganizationCommand,
  AddUserToOrganizationCommandReturnType
> {
  constructor(
    private readonly prisma: PrismaService,
    private readonly idService: IdService,
    @Inject(LIMITS_SERVICE_TOKEN)
    private readonly limitsService: ILimitsService,
  ) {}

  public async execute({ data }: AddUserToOrganizationCommand) {
    if (!isValidOrganizationRole(data.roleId)) {
      throw new BadRequestException('Invalid OrganizationRole');
    }

    const existing = await this.getExistingUserOrganization(data);

    // Only check seat limit when adding a new user, not updating role
    if (!existing) {
      const limitResult = await this.limitsService.checkLimit(
        data.organizationId,
        LimitMetric.SEATS,
        1,
      );
      if (!limitResult.allowed) {
        throw new LimitExceededException(limitResult);
      }
    }

    const userOrganizationId = existing?.id ?? this.idService.generate();

    await this.upsertUserOrganization(data, userOrganizationId);

    return true;
  }

  private upsertUserOrganization(
    data: AddUserToOrganizationCommand['data'],
    userOrganizationId: string,
  ) {
    return this.prisma.userOrganization.upsert({
      where: {
        id: userOrganizationId,
      },
      create: {
        id: userOrganizationId,
        userId: data.userId,
        organizationId: data.organizationId,
        roleId: data.roleId,
      },
      update: {
        roleId: data.roleId,
      },
    });
  }

  private async getExistingUserOrganization(
    data: AddUserToOrganizationCommand['data'],
  ) {
    return this.prisma.userOrganization.findFirst({
      where: {
        userId: data.userId,
        organizationId: data.organizationId,
      },
      select: {
        id: true,
      },
    });
  }
}
