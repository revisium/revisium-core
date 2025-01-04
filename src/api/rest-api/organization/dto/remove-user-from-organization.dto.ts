import { ApiProperty } from '@nestjs/swagger';

export class RemoveUserFromOrganizationDto {
  @ApiProperty({ required: true })
  userId: string;
}
