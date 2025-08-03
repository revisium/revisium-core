import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';

export class ApplyMigrationsResponseDto {
  @ApiProperty({
    description: 'The ID of the entity to which the migration was applied',
  })
  id: string;

  @ApiProperty({
    description: 'The migration application status',
    enum: ['applied', 'failed', 'skipped'],
  })
  status: 'applied' | 'failed' | 'skipped';

  @ApiPropertyOptional({ description: 'Error message if the migration failed' })
  error?: string;
}
