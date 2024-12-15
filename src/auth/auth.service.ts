import { Injectable } from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import * as bcrypt from 'bcrypt';
import * as crypto from 'crypto';
import { JwtSecretService } from 'src/auth/jwt-secret.service';

@Injectable()
export class AuthService {
  constructor(
    private readonly jwtService: JwtService,
    private readonly jwtSecret: JwtSecretService,
  ) {}

  public login(payload: {
    username?: string | null;
    email?: string | null;
    sub: string;
  }) {
    // TODO expiresIn depends on roleId
    return this.jwtService.sign(
      { ...payload },
      { secret: this.jwtSecret.secret },
    );
  }

  public hashPassword(password: string) {
    return bcrypt.hash(password, 10);
  }

  public comparePassword(password: string, hash: string) {
    return bcrypt.compare(password, hash);
  }

  public generateConfirmationCode(): string {
    return crypto.randomUUID().toString();
  }
}
