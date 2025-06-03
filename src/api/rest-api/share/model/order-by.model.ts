import { ApiProperty } from '@nestjs/swagger';
import { IsEnum } from 'class-validator';

export enum SortField {
  createdAt = 'createdAt',
  updatedAt = 'updatedAt',
  publishedAt = 'publishedAt',
  id = 'id',
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
}
