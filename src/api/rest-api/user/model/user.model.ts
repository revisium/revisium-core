import { ApiProperty } from '@nestjs/swagger';

export class UserModel {
  @ApiProperty()
  id: string;

  @ApiProperty({ required: false })
  username?: string;

  @ApiProperty({ required: false })
  email?: string;
}

export class MeModel extends UserModel {
  @ApiProperty()
  hasPassword: boolean;
}
