import { ApiPropertyOptional } from '@nestjs/swagger';
import {
  IsOptional,
  IsString,
  IsArray,
  ArrayNotEmpty,
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
    description: 'Negation filter (not): a simple string',
  })
  @IsOptional()
  @IsString()
  not?: string;
}
