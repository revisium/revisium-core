import { ApiProperty } from '@nestjs/swagger';
import { IsInt, Max, Min } from 'class-validator';
import { Transform } from 'class-transformer';

export class GetUsersOrganizationDto {
  @ApiProperty({ default: 100 })
  @Transform(({ value }) =>
    value === undefined ? 100 : Number.parseInt(value, 10),
  )
  @IsInt()
  @Min(0)
  @Max(1000)
  first: number;

  @ApiProperty({ required: false })
  after?: string;
}
