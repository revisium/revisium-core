import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { Transform } from 'class-transformer';
import { IsInt, IsOptional, Min } from 'class-validator';
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
        example: [{ [SortField.createdAt]: SortDirection.asc }],
        items: {
          type: 'object',
        },
      },
    },
    description: 'Array of sorting criteria',
  })
  @Transform(({ value }) => {
    try {
      const parsed = typeof value === 'string' ? JSON.parse(value) : value;

      if (!Array.isArray(parsed)) {
        throw new Error('orderBy must be an array');
      }

      return parsed.map((entry) => {
        const keys = Object.keys(entry);
        if (keys.length !== 1) {
          throw new Error('Each orderBy item must have exactly one key');
        }

        const key = keys[0];
        const direction = entry[key];

        if (!(key in SortField)) {
          throw new Error(`Invalid sort field: ${key}`);
        }

        if (!(Object.values(SortDirection) as string[]).includes(direction)) {
          throw new Error(`Invalid sort direction for ${key}: ${direction}`);
        }

        return { [key]: direction } as Prisma.RowOrderByWithRelationInput;
      });
    } catch (e) {
      throw new Error('Invalid orderBy format: ' + e.message);
    }
  })
  @IsOptional()
  orderBy?: Prisma.RowOrderByWithRelationInput[];
}
