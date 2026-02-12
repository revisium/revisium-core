import { ApiProperty } from '@nestjs/swagger';
import { Transform } from 'class-transformer';
import {
  IsArray,
  IsBoolean,
  IsEnum,
  IsInt,
  IsOptional,
  IsString,
  Max,
  Min,
} from 'class-validator';
import { ChangeType } from 'src/features/revision-changes/types';

export class GetRowChangesDto {
  @ApiProperty({ default: 100 })
  @Transform(({ value }) =>
    value === undefined ? 100 : Number.parseInt(value, 10),
  )
  @IsInt()
  @Min(0)
  @Max(1000)
  first: number;

  @ApiProperty({ required: false })
  @IsOptional()
  @IsString()
  after?: string;

  @ApiProperty({ required: false })
  @IsOptional()
  @IsString()
  compareWithRevisionId?: string;

  @ApiProperty({ required: false })
  @IsOptional()
  @IsString()
  tableId?: string;

  @ApiProperty({ required: false, enum: ChangeType, isArray: true })
  @IsOptional()
  @Transform(({ value }) =>
    value === undefined ? undefined : Array.isArray(value) ? value : [value],
  )
  @IsArray()
  @IsEnum(ChangeType, { each: true })
  changeTypes?: ChangeType[];

  @ApiProperty({ required: false })
  @IsOptional()
  @IsString()
  search?: string;

  @ApiProperty({ required: false, default: false })
  @IsOptional()
  @Transform(({ value }) => value === 'true' || value === true)
  @IsBoolean()
  includeSystem?: boolean;
}
