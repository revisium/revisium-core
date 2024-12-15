import { AbilityBuilder, PureAbility } from '@casl/ability';
import { createPrismaAbility, PrismaQuery, Subjects } from '@casl/prisma';
import { Injectable } from '@nestjs/common';
import {
  Organization,
  Project,
  Branch,
  Revision,
  Table,
  Row,
  Endpoint,
  User,
} from '@prisma/client';
import { PermissionAction, UserRole } from 'src/auth/consts';
import { PrismaService } from 'src/database/prisma.service';

export type AppSubjects = Subjects<{
  Organization: Organization;
  Project: Project;
  Branch: Branch;
  Revision: Revision;
  Table: Table;
  Row: Row;
  Endpoint: Endpoint;
  User: User;
}>;

export type AppAbility = PureAbility<
  [PermissionAction, AppSubjects],
  PrismaQuery
>;

@Injectable()
export class CaslAbilityFactory {
  constructor(private readonly prisma: PrismaService) {}

  async createAbility(...roles: UserRole[]) {
    const { can, build } = new AbilityBuilder<AppAbility>(createPrismaAbility);

    for (const role of roles) {
      for (const { action, subject, condition } of await this.getPermissions(
        role,
      )) {
        // eslint-disable-next-line @typescript-eslint/ban-ts-comment
        // @ts-expect-error
        can(action, subject as unknown as AppSubjects, condition);
      }
    }

    return build();
  }

  private getPermissions(role: UserRole) {
    return this.prisma.role
      .findUniqueOrThrow({
        where: {
          id: role,
        },
      })
      .permissions();
  }
}
