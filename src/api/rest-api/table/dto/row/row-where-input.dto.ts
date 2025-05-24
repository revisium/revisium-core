import { ApiPropertyOptional } from '@nestjs/swagger';
import { Type } from 'class-transformer';
import { ValidateNested, IsOptional } from 'class-validator';
import { StringFilterDto } from './string-filter.dto';
import { BoolFilterDto } from './bool-filter.dto';
import { DateTimeFilterDto } from './datetime-filter.dto';
import { JsonFilterDto } from './json-filter.dto';

export class RowWhereInputDto {
  @ApiPropertyOptional({
    type: () => [RowWhereInputDto],
    description: 'AND conditions',
  })
  @ValidateNested({ each: true })
  @Type(() => RowWhereInputDto)
  @IsOptional()
  AND?: RowWhereInputDto[];

  @ApiPropertyOptional({
    type: () => [RowWhereInputDto],
    description: 'OR conditions',
  })
  @ValidateNested({ each: true })
  @Type(() => RowWhereInputDto)
  @IsOptional()
  OR?: RowWhereInputDto[];

  @ApiPropertyOptional({
    type: () => [RowWhereInputDto],
    description: 'NOT conditions',
  })
  @ValidateNested({ each: true })
  @Type(() => RowWhereInputDto)
  @IsOptional()
  NOT?: RowWhereInputDto[];

  @ApiPropertyOptional({
    type: () => StringFilterDto,
    description: 'Filter by versionId',
  })
  @ValidateNested()
  @Type(() => StringFilterDto)
  @IsOptional()
  versionId?: StringFilterDto;

  @ApiPropertyOptional({
    type: () => StringFilterDto,
    description: 'Filter by createdId',
  })
  @ValidateNested()
  @Type(() => StringFilterDto)
  @IsOptional()
  createdId?: StringFilterDto;

  @ApiPropertyOptional({
    type: () => StringFilterDto,
    description: 'Filter by id',
  })
  @ValidateNested()
  @Type(() => StringFilterDto)
  @IsOptional()
  id?: StringFilterDto;

  @ApiPropertyOptional({
    type: () => BoolFilterDto,
    description: 'Filter by readonly',
  })
  @ValidateNested()
  @Type(() => BoolFilterDto)
  @IsOptional()
  readonly?: BoolFilterDto;

  @ApiPropertyOptional({
    type: () => DateTimeFilterDto,
    description: 'Filter by createdAt',
  })
  @ValidateNested()
  @Type(() => DateTimeFilterDto)
  @IsOptional()
  createdAt?: DateTimeFilterDto;

  @ApiPropertyOptional({
    type: () => DateTimeFilterDto,
    description: 'Filter by updatedAt',
  })
  @ValidateNested()
  @Type(() => DateTimeFilterDto)
  @IsOptional()
  updatedAt?: DateTimeFilterDto;

  @ApiPropertyOptional({
    type: () => JsonFilterDto,
    description: 'Filter by data',
  })
  @ValidateNested()
  @Type(() => JsonFilterDto)
  @IsOptional()
  data?: JsonFilterDto;

  @ApiPropertyOptional({
    type: () => JsonFilterDto,
    description: 'Filter by meta',
  })
  @ValidateNested()
  @Type(() => JsonFilterDto)
  @IsOptional()
  meta?: JsonFilterDto;

  @ApiPropertyOptional({
    type: () => StringFilterDto,
    description: 'Filter by hash',
  })
  @ValidateNested()
  @Type(() => StringFilterDto)
  @IsOptional()
  hash?: StringFilterDto;

  @ApiPropertyOptional({
    type: () => StringFilterDto,
    description: 'Filter by schemaHash',
  })
  @ValidateNested()
  @Type(() => StringFilterDto)
  @IsOptional()
  schemaHash?: StringFilterDto;
}
