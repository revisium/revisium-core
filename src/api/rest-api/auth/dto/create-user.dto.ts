import { ApiProperty } from '@nestjs/swagger';
import { UserSystemRoles } from 'src/features/auth/consts';

export class CreateUserDto {
  @ApiProperty()
  username: string;

  @ApiProperty({ enum: UserSystemRoles })
  roleId: UserSystemRoles;

  @ApiProperty()
  password: string;

  @ApiProperty({ required: false })
  email?: string;
}
