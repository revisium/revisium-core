import { ApiProperty } from '@nestjs/swagger';
import { IsNotEmpty, IsString, MaxLength } from 'class-validator';

export class LoginDto {
  @ApiProperty({ required: true })
  @IsString()
  @IsNotEmpty()
  @MaxLength(320)
  emailOrUsername: string;

  @ApiProperty({ required: true })
  @IsString()
  @MaxLength(256)
  password: string;
}
