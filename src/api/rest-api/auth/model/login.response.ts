import { ApiProperty } from '@nestjs/swagger';

export class LoginResponse {
  @ApiProperty()
  accessToken: string;

  @ApiProperty()
  expiresIn: number;
}

export class RefreshResponse {
  @ApiProperty()
  expiresIn: number;
}
