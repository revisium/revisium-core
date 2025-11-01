import { ApiProperty } from '@nestjs/swagger';
import { Prisma } from '@prisma/client';
import { Transform } from 'class-transformer';
import { IsEnum, IsInt, Min } from 'class-validator';

export class GetBranchRevisionsDto {
  @ApiProperty({ default: 100 })
  @Transform(({ value }) => Number.parseInt(value, 10))
  @IsInt()
  @Min(0)
  first: number;

  @ApiProperty({ required: false }) after?: string;

  @ApiProperty({ required: false }) before?: string;

  @ApiProperty({ required: false }) inclusive?: boolean;

  @ApiProperty({
    enum: Prisma.SortOrder,
    required: false,
    description: 'Sort order: asc (default) or desc',
  })
  @IsEnum(Prisma.SortOrder, {
    message: 'direction must be a valid SortDirection',
  })
  sort: Prisma.SortOrder;
}
