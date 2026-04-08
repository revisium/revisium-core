import {
  AbilityBuilder,
  createMongoAbility,
  MongoAbility,
  MongoQuery,
} from '@casl/ability';
import { AnyObject } from '@casl/ability/dist/types/types';
import { Injectable } from '@nestjs/common';
import { UserRole } from 'src/features/auth/consts';
import { ICaslRule } from 'src/features/auth/types';
import { AuthCacheService } from 'src/infrastructure/cache/services/auth-cache.service';
import { PrismaService } from 'src/infrastructure/database/prisma.service';

@Injectable()
export class CaslAbilityFactory {
  constructor(
    private readonly prisma: PrismaService,
    private readonly authCache: AuthCacheService,
  ) {}

  async createAbility(...roles: UserRole[]) {
    const { can, build } = new AbilityBuilder(createMongoAbility);

    for (const role of roles) {
      for (const {
        action,
        subject,
        condition,
      } of await this.authCache.rolePermissions(role, () =>
        this.getPermissions(role),
      )) {
        can(action, subject, condition as MongoQuery<AnyObject>);
      }
    }

    return build();
  }

  createFromRules(rules: ICaslRule[]) {
    const { can, cannot, build } = new AbilityBuilder(createMongoAbility);

    for (const rule of rules) {
      const fn = rule.inverted ? cannot : can;
      const actions = Array.isArray(rule.action) ? rule.action : [rule.action];
      const subjects = Array.isArray(rule.subject)
        ? rule.subject
        : [rule.subject];

      for (const action of actions) {
        for (const subject of subjects) {
          this.applyRule(fn, action, subject, rule);
        }
      }
    }

    return build();
  }

  private applyRule(
    fn: AbilityBuilder<MongoAbility>['can'],
    action: string,
    subject: string,
    rule: ICaslRule,
  ) {
    if (rule.conditions) {
      fn(
        action,
        subject,
        rule.fields,
        rule.conditions as MongoQuery<AnyObject>,
      );
    } else if (rule.fields) {
      fn(action, subject, rule.fields);
    } else {
      fn(action, subject);
    }
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
