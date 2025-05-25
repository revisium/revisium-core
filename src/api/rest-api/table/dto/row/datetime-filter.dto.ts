import { ApiPropertyOptional } from '@nestjs/swagger';
import {
  ArrayNotEmpty,
  IsArray,
  IsDateString,
  IsOptional,
} from 'class-validator';

export class DateTimeFilterDto {
  @ApiPropertyOptional({ format: 'date-time' })
  @IsOptional()
  @IsDateString()
  equals?: string;

  @ApiPropertyOptional({
    isArray: true,
    type: String,
    format: 'date-time',
  })
  @IsOptional()
  @IsArray()
  @ArrayNotEmpty()
  @IsDateString(undefined, { each: true })
  in?: string[];

  @ApiPropertyOptional({
    isArray: true,
    type: String,
    format: 'date-time',
  })
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
}
