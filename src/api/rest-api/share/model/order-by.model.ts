import { ApiProperty } from '@nestjs/swagger';
import { IsEnum } from 'class-validator';

export enum SortField {
  createdAt = 'createdAt',
  updatedAt = 'updatedAt',
  id = 'id',
}

export enum SortDirection {
  asc = 'asc',
  desc = 'desc',
}

export class OrderByDto {
  @ApiProperty({ enum: SortField })
  @IsEnum(SortField)
  field: SortField;

  @ApiProperty({ enum: SortDirection })
  @IsEnum(SortDirection)
  direction: SortDirection;
}
