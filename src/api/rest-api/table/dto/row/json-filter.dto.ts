import { ApiPropertyOptional } from '@nestjs/swagger';
import { Type } from 'class-transformer';
import {
  IsOptional,
  IsString,
  IsArray,
  ArrayNotEmpty,
  ValidateNested,
  IsNumber,
  IsIn,
} from 'class-validator';

export class JsonFilterDto {
  @ApiPropertyOptional({ description: 'Exact JSON match' })
  @IsOptional()
  equals?: any;

  @ApiPropertyOptional({
    type: () => JsonFilterDto,
    description: 'Negated JSON filter (not)',
  })
  @ValidateNested()
  @Type(() => JsonFilterDto)
  @IsOptional()
  not?: JsonFilterDto | any;

  @ApiPropertyOptional({
    type: [String],
    description:
      'Path in JSON (PostgreSQL: array of keys/indexes, e.g. ["pet1","petName"])',
  })
  @IsOptional()
  @IsArray()
  @ArrayNotEmpty()
  @IsString({ each: true })
  path?: string[];

  @ApiPropertyOptional({ description: 'Substring match in JSON string value' })
  @IsOptional()
  @IsString()
  string_contains?: string;

  @ApiPropertyOptional({ description: 'Prefix match in JSON string value' })
  @IsOptional()
  @IsString()
  string_starts_with?: string;

  @ApiPropertyOptional({ description: 'Suffix match in JSON string value' })
  @IsOptional()
  @IsString()
  string_ends_with?: string;

  @ApiPropertyOptional({
    enum: ['default', 'insensitive'],
    description:
      'Case sensitivity mode for string filters within JSON ("insensitive" uses ILIKE on PostgreSQL)',
  })
  @IsOptional()
  @IsIn(['default', 'insensitive'])
  mode?: 'default' | 'insensitive';

  @ApiPropertyOptional({
    type: [Object],
    description:
      'Filter on arrays: JSON array must contain *all* of these values',
  })
  @IsOptional()
  @IsArray()
  @ArrayNotEmpty()
  array_contains?: any[];

  @ApiPropertyOptional({
    type: [Object],
    description:
      'Filter on arrays: JSON array must start with *exactly* these values',
  })
  @IsOptional()
  @IsArray()
  @ArrayNotEmpty()
  array_starts_with?: any[];

  @ApiPropertyOptional({
    type: [Object],
    description:
      'Filter on arrays: JSON array must end with *exactly* these values',
  })
  @IsOptional()
  @IsArray()
  @ArrayNotEmpty()
  array_ends_with?: any[];
  // :contentReference[oaicite:2]{index=2}

  @ApiPropertyOptional({ description: 'Numeric comparison: less than (<)' })
  @IsOptional()
  @IsNumber()
  lt?: number;

  @ApiPropertyOptional({
    description: 'Numeric comparison: less than or equal (≤)',
  })
  @IsOptional()
  @IsNumber()
  lte?: number;

  @ApiPropertyOptional({ description: 'Numeric comparison: greater than (>)' })
  @IsOptional()
  @IsNumber()
  gt?: number;

  @ApiPropertyOptional({
    description: 'Numeric comparison: greater than or equal (≥)',
  })
  @IsOptional()
  @IsNumber()
  gte?: number;
}
