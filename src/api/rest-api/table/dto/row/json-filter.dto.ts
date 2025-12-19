import { ApiPropertyOptional } from '@nestjs/swagger';
import {
  IsOptional,
  IsString,
  IsArray,
  ArrayNotEmpty,
  IsIn,
  IsNumber,
} from 'class-validator';
import { SEARCH_LANGUAGES } from '@revisium/prisma-pg-json';

export class JsonFilterDto {
  @ApiPropertyOptional({ description: 'Exact JSON match' })
  @IsOptional()
  equals?: any;

  @ApiPropertyOptional({
    oneOf: [{ type: 'string' }, { type: 'array', items: { type: 'string' } }],
    description:
      'Path in JSON (PostgreSQL: array of keys/indexes, e.g. ["pet1","petName"] or dot notation "pet1.petName")',
  })
  @IsOptional()
  path?: string | string[];

  @ApiPropertyOptional({
    enum: ['default', 'insensitive'],
    description:
      'Case sensitivity mode for string filters within JSON ("insensitive" uses ILIKE on PostgreSQL)',
  })
  @IsOptional()
  @IsIn(['default', 'insensitive'])
  mode?: 'default' | 'insensitive';

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
    type: [Object],
    description:
      'Filter on arrays: target JSON array must contain *all* of these values',
  })
  @IsOptional()
  @IsArray()
  @ArrayNotEmpty()
  array_contains?: any[];

  @ApiPropertyOptional({
    description:
      'JSON value that the target JSON array must start with (could be object, array, primitive)',
  })
  @IsOptional()
  array_starts_with?: any;

  @ApiPropertyOptional({
    description:
      'JSON value that the target JSON array must end with (could be object, array, primitive)',
  })
  @IsOptional()
  array_ends_with?: any;

  @ApiPropertyOptional({
    description: 'Less-than comparison. Must be a number or numeric JSON value',
  })
  @IsOptional()
  @IsNumber()
  lt?: number;

  @ApiPropertyOptional({
    description:
      'Less-than-or-equal comparison. Must be a number or numeric JSON value',
  })
  @IsOptional()
  @IsNumber()
  lte?: number;

  @ApiPropertyOptional({
    description:
      'Greater-than comparison. Must be a number or numeric JSON value',
  })
  @IsOptional()
  @IsNumber()
  gt?: number;

  @ApiPropertyOptional({
    description:
      'Greater-than-or-equal comparison. Must be a number or numeric JSON value',
  })
  @IsOptional()
  @IsNumber()
  gte?: number;

  @ApiPropertyOptional({
    description: 'Full-text search string for JSON content',
  })
  @IsOptional()
  @IsString()
  search?: string;

  @ApiPropertyOptional({
    enum: SEARCH_LANGUAGES,
    description: 'Language for full-text search. Default: simple',
  })
  @IsOptional()
  @IsIn(SEARCH_LANGUAGES)
  searchLanguage?: string;

  @ApiPropertyOptional({
    enum: ['plain', 'phrase'],
    description:
      'Search type: plain (individual words) or phrase (exact phrase)',
  })
  @IsOptional()
  @IsIn(['plain', 'phrase'])
  searchType?: 'plain' | 'phrase';

  @ApiPropertyOptional({
    enum: ['all', 'values', 'keys', 'strings', 'numbers', 'booleans'],
    description: 'Scope of search within JSON structure',
  })
  @IsOptional()
  @IsIn(['all', 'values', 'keys', 'strings', 'numbers', 'booleans'])
  searchIn?: 'all' | 'values' | 'keys' | 'strings' | 'numbers' | 'booleans';
}
