import { Injectable } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { nanoid } from 'nanoid';

@Injectable()
export class JwtSecretService {
  public readonly secret: string;

  constructor(private readonly configService: ConfigService) {
    this.secret = this.configService.get('JWT_SECRET') || this.generateSecret();
  }

  private generateSecret() {
    return nanoid(); // TODO need to use database
  }
}
