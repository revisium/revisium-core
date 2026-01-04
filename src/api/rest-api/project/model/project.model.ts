import { ApiProperty } from '@nestjs/swagger';

export class ProjectModel {
  @ApiProperty({
    description: 'Unique project identifier',
    example: 'V1StGXR8_Z5jdHi6B-myT',
  })
  id: string;

  @ApiProperty({
    description: 'Organization that owns this project',
    example: 'acme-corp',
  })
  organizationId: string;

  @ApiProperty({
    description: 'Timestamp when the project was created',
    example: '2024-01-15T10:30:00.000Z',
  })
  createdAt: Date;

  @ApiProperty({
    description:
      'URL-friendly project name (lowercase letters, numbers, hyphens)',
    example: 'my-blog',
  })
  name: string;
}
