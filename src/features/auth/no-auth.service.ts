import { Injectable } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { IAuthUser } from 'src/features/auth/types';

@Injectable()
export class NoAuthService {
  public readonly enabled: boolean;

  constructor(configService: ConfigService) {
    this.enabled = configService.get('REVISIUM_NO_AUTH') === 'true';
  }

  public get adminUser(): IAuthUser {
    return { userId: 'admin', email: '' };
  }
}
