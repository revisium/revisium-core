import { nanoid } from 'nanoid';
import type { INestApplication } from '@nestjs/common';
import { AuthService } from 'src/features/auth/auth.service';
import { UserSystemRoles } from 'src/features/auth/consts';
import { PrismaService } from 'src/infrastructure/database/prisma.service';
import { testCreateUser } from 'src/testing/factories/create-models';
import type { ActorDescriptor, ActorRole } from './types';

/**
 * Shape the actors kit needs to resolve `owner` / `crossOwner` tokens from a
 * fixture. Matches what `prepareData()` returns, so any fixture that
 * extends `PrepareDataReturnType` satisfies this.
 */
export interface AuthActorFixture {
  owner: { token: string };
  anotherOwner: { token: string };
}

/**
 * Minimal actor factories for the pilot. Richer variants from the doc
 * (actors.user({ orgRole, inOrg }), actors.apiKey({ scopes, ... })) land
 * when the first spec actually needs them.
 */
export const actors = {
  anonymous(): ActorDescriptor {
    return { token: null, label: 'anonymous' };
  },
  fromToken(token: string, label?: string): ActorDescriptor {
    return { token, label: label ?? 'user' };
  },
  owner(fixture: AuthActorFixture): ActorDescriptor {
    return { token: fixture.owner.token, label: 'owner' };
  },
  crossOwner(fixture: AuthActorFixture): ActorDescriptor {
    return { token: fixture.anotherOwner.token, label: 'cross-owner' };
  },
  /** Dispatches a role to the right actor factory. */
  resolveRole(fixture: AuthActorFixture, role: ActorRole): ActorDescriptor {
    switch (role) {
      case 'owner':
        return actors.owner(fixture);
      case 'crossOwner':
        return actors.crossOwner(fixture);
      case 'anonymous':
        return actors.anonymous();
    }
  },
  /**
   * Seeds a systemAdmin user and returns their actor descriptor.
   * Used for admin-only endpoints (adminUsers, adminCacheStats, etc.).
   */
  async admin(app: INestApplication): Promise<ActorDescriptor> {
    const prisma = app.get(PrismaService);
    const authService = app.get(AuthService);
    const userId = nanoid();
    const user = await testCreateUser(prisma, {
      id: userId,
      roleId: UserSystemRoles.systemAdmin,
    });
    const token = authService.login({
      username: user.username ?? '',
      sub: user.id,
    });
    return { token, label: 'admin' };
  },
};
