import { ApiProperty } from '@nestjs/swagger';
import { IsBoolean, IsOptional, IsString } from 'class-validator';
import { Transform } from 'class-transformer';

export class GetRevisionChangesDto {
  @ApiProperty({ required: false })
  @IsOptional()
  @IsString()
  compareWithRevisionId?: string;

  @ApiProperty({ required: false, default: false })
  @IsOptional()
  @Transform(({ value }) => {
    if (value === undefined) {
      return undefined;
    }
    return value === 'true' || value === true;
  })
  @IsBoolean()
  includeSystem?: boolean;
}
