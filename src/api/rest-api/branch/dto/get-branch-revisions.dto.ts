import { ApiProperty } from '@nestjs/swagger';
import { Prisma } from 'src/__generated__/client';
import { Transform } from 'class-transformer';
import { IsEnum, IsInt, Min, IsOptional } from 'class-validator';

export class GetBranchRevisionsDto {
  @ApiProperty({ default: 100 })
  @Transform(({ value }) => Number.parseInt(value, 10))
  @IsInt()
  @Min(0)
  first: number;

  @ApiProperty({ required: false })
  @IsOptional()
  after?: string;

  @ApiProperty({ required: false })
  @IsOptional()
  before?: string;

  @ApiProperty({ required: false })
  @IsOptional()
  inclusive?: boolean;

  @ApiProperty({
    enum: Prisma.SortOrder,
    required: false,
    description: 'Sort order: asc (default) or desc',
  })
  @IsOptional()
  @IsEnum(Prisma.SortOrder)
  sort?: Prisma.SortOrder;
}
