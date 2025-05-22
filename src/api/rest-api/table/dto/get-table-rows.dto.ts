import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { Transform } from 'class-transformer';
import { IsEnum, IsInt, IsOptional, Min } from 'class-validator';
import { Prisma } from '@prisma/client';

export enum SortDirection {
  asc = 'asc',
  desc = 'desc',
}

export enum SortField {
  createdAt = 'createdAt',
  updatedAt = 'updatedAt',
  id = 'id',
}

export class OrderByItemDto {
  @IsEnum(SortField)
  field: SortField;

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
    description: 'Array of sorting criteria',
    example: [
      { field: SortField.createdAt, direction: SortDirection.asc },
      { field: SortField.updatedAt, direction: SortDirection.desc },
    ],
    type: [OrderByItemDto],
  })
  @Transform(({ value }) => {
    try {
      const parsed: unknown =
        typeof value === 'string' ? JSON.parse(value) : value;

      if (!Array.isArray(parsed)) {
        throw new Error('orderBy must be an array');
      }

      return parsed.map((item) => {
        if (
          typeof item !== 'object' ||
          Array.isArray(item) ||
          !item.field ||
          !item.direction
        ) {
          throw new Error('Each orderBy item must have field and direction');
        }

        if (!(item.field in SortField)) {
          throw new Error(`Invalid sort field: ${item.field}`);
        }

        if (
          !(Object.values(SortDirection) as string[]).includes(item.direction)
        ) {
          throw new Error(`Invalid sort direction: ${item.direction}`);
        }

        return {
          [item.field]: item.direction,
        } as Prisma.RowOrderByWithRelationInput;
      });
    } catch (e) {
      throw new Error('Invalid orderBy format: ' + e.message);
    }
  })
  @IsOptional()
  orderBy?: Prisma.RowOrderByWithRelationInput[];
}
