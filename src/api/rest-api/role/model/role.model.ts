import { ApiProperty } from '@nestjs/swagger';

export class RoleModel {
  @ApiProperty()
  id: string;

  @ApiProperty()
  name: string;
}
