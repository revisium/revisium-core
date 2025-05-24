// filters/bool-filter.dto.ts
import {
  ApiExtraModels,
  ApiPropertyOptional,
  getSchemaPath,
} from '@nestjs/swagger';
import { Type } from 'class-transformer';
import { IsOptional, IsBoolean, ValidateNested } from 'class-validator';

export class BoolFilterDto {
  @ApiPropertyOptional()
  @IsOptional()
  @IsBoolean()
  equals?: boolean;

  @ApiPropertyOptional({
    oneOf: [{ $ref: getSchemaPath(BoolFilterDto) }, { type: 'boolean' }],
    description: 'Filter negation (not).',
  })
  @ValidateNested()
  @Type(() => BoolFilterDto)
  @IsOptional()
  not?: BoolFilterDto | boolean;
}
