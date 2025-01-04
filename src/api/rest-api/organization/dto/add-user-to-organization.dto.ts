import { ApiProperty } from '@nestjs/swagger';
import { UserOrganizationRoles } from 'src/features/auth/consts';

export class AddUserToOrganizationDto {
  @ApiProperty({ required: true })
  userId: string;

  @ApiProperty({ enum: UserOrganizationRoles })
  roleId: UserOrganizationRoles;
}
