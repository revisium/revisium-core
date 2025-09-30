import { ApiProperty } from '@nestjs/swagger';
import { IsInt, Min } from 'class-validator';
import { Transform } from 'class-transformer';

export class GetUsersOrganizationDto {
  @ApiProperty({ default: 100 })
  @Transform(({ value }) => Number.parseInt(value, 10))
  @IsInt()
  @Min(0)
  first: number;

  @ApiProperty({ required: false })
  after?: string;
}
