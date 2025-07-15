import { Injectable } from '@nestjs/common';
import { AuthGuard } from '@nestjs/passport';

@Injectable()
export class OptionalHttpJwtAuthGuard extends AuthGuard('jwt') {
  handleRequest(_: any, user: any) {
    return user;
  }
}
