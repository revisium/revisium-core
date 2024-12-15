import { ApiProperty } from '@nestjs/swagger';
import { Transform } from 'class-transformer';
import { IsInt, Min } from 'class-validator';

export class GetRowReferencesToDto {
  @ApiProperty()
  referenceToTableId: string;

  @ApiProperty({ default: 100 })
  @Transform(({ value }) => parseInt(value, 10))
  @IsInt()
  @Min(0)
  first: number;

  @ApiProperty({ required: false })
  after?: string;
}
