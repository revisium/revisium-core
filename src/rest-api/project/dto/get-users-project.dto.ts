import { ApiProperty } from '@nestjs/swagger';
import { IsInt, Min } from 'class-validator';
import { Transform } from 'class-transformer';

export class GetUsersProjectDto {
  @ApiProperty({ default: 100 })
  @Transform(({ value }) => parseInt(value, 10))
  @IsInt()
  @Min(0)
  first: number;

  @ApiProperty({ required: false })
  after?: string;
}
