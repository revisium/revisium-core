import { AbilityBuilder, createMongoAbility, MongoQuery } from '@casl/ability';
import { AnyObject } from '@casl/ability/dist/types/types';
import { Injectable } from '@nestjs/common';
import { UserRole } from 'src/features/auth/consts';
import { CachedMethod } from 'src/infrastructure/cache-manager/method-cache.decorator';
import { PrismaService } from 'src/infrastructure/database/prisma.service';

@Injectable()
export class CaslAbilityFactory {
  constructor(private readonly prisma: PrismaService) {}

  async createAbility(...roles: UserRole[]) {
    const { can, build } = new AbilityBuilder(createMongoAbility);

    for (const role of roles) {
      for (const { action, subject, condition } of await this.getPermissions(
        role,
      )) {
        can(action, subject, condition as MongoQuery<AnyObject>);
      }
    }

    return build();
  }

  @CachedMethod<
    UserRole,
    Array<{ action: string; subject: string; condition?: object }>
  >({
    keyPrefix: 'role:permissions',
    makeKey: ([role]) => role,
    makeTags: ([role]) => ['dict:roles', `role:${role}`],
    ttlSec: 24 * 60 * 60,
  })
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
