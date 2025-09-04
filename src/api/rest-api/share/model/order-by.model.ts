import { ApiProperty } from '@nestjs/swagger';
import { IsEnum, IsOptional, IsString } from 'class-validator';

export type JsonValueType = 'text' | 'int' | 'float' | 'boolean' | 'timestamp';
export type JsonAggregation = 'min' | 'max' | 'avg' | 'first' | 'last';

export enum JsonValueTypeEnum {
  text = 'text',
  int = 'int',
  float = 'float',
  boolean = 'boolean',
  timestamp = 'timestamp',
}

export enum JsonAggregationEnum {
  min = 'min',
  max = 'max',
  avg = 'avg',
  first = 'first',
  last = 'last',
}

export enum SortField {
  createdAt = 'createdAt',
  updatedAt = 'updatedAt',
  publishedAt = 'publishedAt',
  id = 'id',
  data = 'data',
}

export enum SortDirection {
  asc = 'asc',
  desc = 'desc',
}

export class OrderByDto {
  @ApiProperty({ enum: SortField })
  @IsEnum(SortField, { message: 'field must be a valid SortField' })
  field: SortField;

  @ApiProperty({ enum: SortDirection })
  @IsEnum(SortDirection, { message: 'direction must be a valid SortDirection' })
  direction: SortDirection;

  @ApiProperty({ required: false })
  @IsOptional()
  @IsString()
  path?: string;

  @ApiProperty({ required: false, enum: JsonValueTypeEnum })
  @IsOptional()
  @IsEnum(JsonValueTypeEnum, { message: 'type must be a valid JsonValueType' })
  type?: JsonValueTypeEnum;

  @ApiProperty({ required: false, enum: JsonAggregationEnum })
  @IsOptional()
  @IsEnum(JsonAggregationEnum, {
    message: 'aggregation must be a valid JsonAggregation',
  })
  aggregation?: JsonAggregationEnum;
}
