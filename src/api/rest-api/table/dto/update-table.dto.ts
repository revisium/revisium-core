import { ApiProperty } from '@nestjs/swagger';
import { JsonPatch } from '@revisium/schema-toolkit/types';

export class UpdateTableDto {
  @ApiProperty({ type: 'array', items: { type: 'object' } })
  patches: JsonPatch[];
}
