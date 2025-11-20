import { ApiProperty } from '@nestjs/swagger';
import { Prisma } from 'src/__generated__/client';

export class CreateRowDto {
  @ApiProperty()
  rowId: string;

  @ApiProperty({ type: 'object', additionalProperties: true })
  data: Prisma.InputJsonValue;

  @ApiProperty({ required: false })
  isRestore?: boolean;
}
