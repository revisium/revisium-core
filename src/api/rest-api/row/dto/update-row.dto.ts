import { ApiProperty } from '@nestjs/swagger';
import { Prisma } from '@prisma/client';

export class UpdateRowDto {
  @ApiProperty({ type: 'object', additionalProperties: true })
  data: Prisma.InputJsonValue;
}
