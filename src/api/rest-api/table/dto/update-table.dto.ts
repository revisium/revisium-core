import { ApiProperty } from '@nestjs/swagger';
import { JsonPatch } from 'src/features/share/utils/schema/types/json-patch.types';

export class UpdateTableDto {
  @ApiProperty({ type: 'array', items: { type: 'object' } })
  patches: JsonPatch[];
}
