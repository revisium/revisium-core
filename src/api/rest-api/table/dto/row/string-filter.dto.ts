import { ApiPropertyOptional, getSchemaPath } from '@nestjs/swagger';
import { Type } from 'class-transformer';
import {
  IsOptional,
  IsString,
  IsArray,
  ArrayNotEmpty,
  ValidateNested,
  IsIn,
} from 'class-validator';

export class StringFilterDto {
  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  equals?: string;

  @ApiPropertyOptional({ type: [String] })
  @IsOptional()
  @IsArray()
  @ArrayNotEmpty()
  @IsString({ each: true })
  in?: string[];

  @ApiPropertyOptional({ type: [String] })
  @IsOptional()
  @IsArray()
  @ArrayNotEmpty()
  @IsString({ each: true })
  notIn?: string[];

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  lt?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  lte?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  gt?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  gte?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  contains?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  startsWith?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  endsWith?: string;

  @ApiPropertyOptional({ enum: ['default', 'insensitive'] })
  @IsOptional()
  @IsIn(['default', 'insensitive'])
  mode?: 'default' | 'insensitive';

  @ApiPropertyOptional({
    oneOf: [{ $ref: getSchemaPath(StringFilterDto) }, { type: 'string' }],
    description: 'Filter negation (not).',
  })
  @ValidateNested()
  @Type(() => StringFilterDto)
  @IsOptional()
  not?: StringFilterDto | string;
}
