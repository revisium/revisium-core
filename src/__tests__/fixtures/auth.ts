import { INestApplication } from '@nestjs/common';
import { AuthService } from 'src/features/auth/auth.service';
import { tableByIdManifest } from './manifests';

export interface FixtureAuth {
  ownerToken: string;
  anotherOwnerToken: string;
}

export function getFixtureAuth(app: INestApplication): FixtureAuth {
  const authService = app.get(AuthService);

  return {
    ownerToken: authService.login({
      username: tableByIdManifest.owner.username,
      sub: tableByIdManifest.owner.userId,
    }),
    anotherOwnerToken: authService.login({
      username: tableByIdManifest.anotherOwner.username,
      sub: tableByIdManifest.anotherOwner.userId,
    }),
  };
}
