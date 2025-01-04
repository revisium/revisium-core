import { ApiProperty } from '@nestjs/swagger';

export class CreateProjectDto {
  @ApiProperty()
  projectName: string;

  @ApiProperty({ required: false, default: 'master' })
  branchName?: string;
}
