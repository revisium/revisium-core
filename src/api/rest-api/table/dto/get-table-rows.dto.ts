import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { Transform, Type } from 'class-transformer';
import {
  IsEnum,
  IsInt,
  IsOptional,
  IsString,
  Min,
  ValidateNested,
} from 'class-validator';

export enum SortDirection {
  asc = 'asc',
  desc = 'desc',
}

export class OrderByDto {
  @ApiProperty({
    enum: ['id', 'createdAt', 'name'],
    description: 'Поле для сортировки',
  })
  @IsString()
  field: 'id' | 'createdAt' | 'name';

  @ApiProperty({
    enum: SortDirection,
    description: 'Направление сортировки',
  })
  @IsEnum(SortDirection)
  direction: SortDirection;
}

export class GetTableRowsDto {
  @ApiProperty({ default: 100 })
  @Transform(({ value }) => parseInt(value, 10))
  @IsInt()
  @Min(0)
  first: number;

  @ApiProperty({ required: false })
  after?: string;

  @ApiPropertyOptional({
    type: 'object',
    properties: {
      orderBy: {
        type: 'array',
        example: [{ createdAt: 'asc' }],
        items: {
          type: 'object',
        },
      },
    },
    description: 'Массив критериев сортировки',
  })
  @Transform(({ value }) => {
    console.log('value', value, typeof value);
    console.log(
      'parsed',
      typeof value === 'string' ? JSON.parse(value) : value,
    );
    try {
      const parsed = typeof value === 'string' ? JSON.parse(value) : value;
      return Array.isArray(parsed) ? parsed : [parsed];
    } catch (e) {
      throw new Error('Invalid JSON in orderBy');
    }
  })
  @IsOptional()
  @ValidateNested({ each: true })
  @Type(() => OrderByDto)
  orderBy?: OrderByDto;
}
