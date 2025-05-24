import { ApiPropertyOptional, getSchemaPath } from '@nestjs/swagger';
import { Type } from 'class-transformer';
import {
  IsOptional,
  IsDateString,
  IsArray,
  ArrayNotEmpty,
  ValidateNested,
} from 'class-validator';

export class DateTimeFilterDto {
  @ApiPropertyOptional({ format: 'date-time' })
  @IsOptional()
  @IsDateString()
  equals?: string;

  @ApiPropertyOptional({ isArray: true, type: String, format: 'date-time' })
  @IsOptional()
  @IsArray()
  @ArrayNotEmpty()
  @IsDateString(undefined, { each: true })
  in?: string[];

  @ApiPropertyOptional({ isArray: true, type: String, format: 'date-time' })
  @IsOptional()
  @IsArray()
  @ArrayNotEmpty()
  @IsDateString(undefined, { each: true })
  notIn?: string[];

  @ApiPropertyOptional({ format: 'date-time' })
  @IsOptional()
  @IsDateString()
  lt?: string;

  @ApiPropertyOptional({ format: 'date-time' })
  @IsOptional()
  @IsDateString()
  lte?: string;

  @ApiPropertyOptional({ format: 'date-time' })
  @IsOptional()
  @IsDateString()
  gt?: string;

  @ApiPropertyOptional({ format: 'date-time' })
  @IsOptional()
  @IsDateString()
  gte?: string;

  @ApiPropertyOptional({
    oneOf: [
      { $ref: getSchemaPath(DateTimeFilterDto) },
      { type: 'string', format: 'date-time' },
    ],
    description: 'Filter negation (not).',
  })
  @ValidateNested()
  @Type(() => DateTimeFilterDto)
  @IsOptional()
  not?: DateTimeFilterDto | string;
}
