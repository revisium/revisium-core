import { ApiProperty } from '@nestjs/swagger';

export class LoginDto {
  @ApiProperty({ required: true })
  emailOrUsername: string;

  @ApiProperty({ required: true })
  password: string;
}
