import { ApiProperty } from '@nestjs/swagger';

export class ProjectModel {
  @ApiProperty()
  id: string;

  @ApiProperty()
  organizationId: string;

  @ApiProperty()
  createdAt: Date;

  @ApiProperty()
  name: string;
}
