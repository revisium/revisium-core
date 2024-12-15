import { ApiProperty } from '@nestjs/swagger';
import { UserProjectRoles } from 'src/auth/consts';

export class AddUserToProjectDto {
  @ApiProperty({ required: true })
  userId: string;

  @ApiProperty({ enum: UserProjectRoles })
  roleId: UserProjectRoles;
}
