import { ApiProperty } from '@nestjs/swagger';
import { IsBoolean, IsOptional, IsString } from 'class-validator';
import { TransformOptionalBoolean } from 'src/api/rest-api/share/decorators';

export class GetRevisionChangesDto {
  @ApiProperty({ required: false })
  @IsOptional()
  @IsString()
  compareWithRevisionId?: string;

  @ApiProperty({ required: false, default: false })
  @IsOptional()
  @TransformOptionalBoolean()
  @IsBoolean()
  includeSystem?: boolean;
}
