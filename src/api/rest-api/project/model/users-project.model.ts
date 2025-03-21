import { ApiProperty } from '@nestjs/swagger';
import { RoleModel } from 'src/api/rest-api/role/model';
import { UserModel } from 'src/api/rest-api/user/model';

export class UsersProjectModel {
  @ApiProperty()
  id: string;

  @ApiProperty({ type: UserModel })
  user: UserModel;

  @ApiProperty({ type: RoleModel })
  role: RoleModel;
}
