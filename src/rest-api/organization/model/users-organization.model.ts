import { ApiProperty } from '@nestjs/swagger';
import { RoleModel } from 'src/rest-api/role/model';
import { UserModel } from 'src/rest-api/user/model';

export class UsersOrganizationModel {
  @ApiProperty()
  id: string;

  @ApiProperty({ type: UserModel })
  user: UserModel;

  @ApiProperty({ type: RoleModel })
  role: RoleModel;
}
