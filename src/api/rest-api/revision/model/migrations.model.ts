import { ApiProperty } from '@nestjs/swagger';
import { JsonPatch } from 'src/features/share/utils/schema/types/json-patch.types';

export class MigrationsModel {
  @ApiProperty()
  tableId: string;

  @ApiProperty()
  hash: string;

  @ApiProperty()
  date: string;

  @ApiProperty({
    type: [Object],
    description: 'Array of JSON patch operations',
  })
  patches: JsonPatch[];
}
