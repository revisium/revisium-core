import { ApiProperty } from '@nestjs/swagger';
import { Type } from 'class-transformer';
import {
  ArrayMaxSize,
  ArrayNotEmpty,
  IsString,
  ValidateNested,
} from 'class-validator';
import { Prisma } from 'src/__generated__/client';

export class CreateRowsRowDto {
  @ApiProperty()
  @IsString()
  rowId: string;

  @ApiProperty({ type: 'object', additionalProperties: true })
  data: Prisma.InputJsonValue;
}

export class CreateRowsDto {
  @ApiProperty({ type: [CreateRowsRowDto], maxItems: 1000 })
  @ArrayNotEmpty({ message: 'rows array cannot be empty' })
  @ArrayMaxSize(1000, { message: 'rows array cannot exceed 1000 items' })
  @ValidateNested({ each: true })
  @Type(() => CreateRowsRowDto)
  rows: CreateRowsRowDto[];
}
