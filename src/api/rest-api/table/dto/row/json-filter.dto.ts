import { ApiPropertyOptional, getSchemaPath } from '@nestjs/swagger';
import { Type } from 'class-transformer';
import {
  IsOptional,
  IsArray,
  ArrayNotEmpty,
  IsString,
  IsNumber,
  ValidateNested,
} from 'class-validator';

export class JsonFilterDto {
  @ApiPropertyOptional({ description: 'Full JSON match' })
  @IsOptional()
  equals?: any;

  @ApiPropertyOptional({
    oneOf: [{ $ref: getSchemaPath(JsonFilterDto) }, { type: 'object' }],
    description: 'Filter negation (not).',
  })
  @ValidateNested()
  @Type(() => JsonFilterDto)
  @IsOptional()
  not?: JsonFilterDto | any;

  @ApiPropertyOptional({ type: [String], description: 'Path inside JSON' })
  @IsOptional()
  @IsArray()
  @ArrayNotEmpty()
  @IsString({ each: true })
  path?: string[];

  @ApiPropertyOptional({ description: 'Substring in JSON string' })
  @IsOptional()
  @IsString()
  string_contains?: string;

  @ApiPropertyOptional({ description: 'Prefix in JSON string' })
  @IsOptional()
  @IsString()
  string_starts_with?: string;

  @ApiPropertyOptional({ description: 'Suffix in JSON string' })
  @IsOptional()
  @IsString()
  string_ends_with?: string;

  @ApiPropertyOptional({
    type: [Object],
    description: 'Array that should be contained',
  })
  @IsOptional()
  @IsArray()
  @ArrayNotEmpty()
  array_contains?: any[];

  @ApiPropertyOptional({
    type: [Object],
    description: 'Array to start with',
  })
  @IsOptional()
  @IsArray()
  @ArrayNotEmpty()
  array_starts_with?: any[];

  @ApiPropertyOptional({
    type: [Object],
    description: 'Array to end with',
  })
  @IsOptional()
  @IsArray()
  @ArrayNotEmpty()
  array_ends_with?: any[];

  @ApiPropertyOptional({ description: 'Numeric comparison: less than' })
  @IsOptional()
  @IsNumber()
  lt?: number;

  @ApiPropertyOptional({ description: 'Numeric comparison: less than or equal' })
  @IsOptional()
  @IsNumber()
  lte?: number;

  @ApiPropertyOptional({ description: 'Numeric comparison: greater than' })
  @IsOptional()
  @IsNumber()
  gt?: number;

  @ApiPropertyOptional({ description: 'Numeric comparison: greater than or equal' })
  @IsOptional()
  @IsNumber()
  gte?: number;
}
