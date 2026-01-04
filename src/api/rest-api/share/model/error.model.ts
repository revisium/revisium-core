import { ApiProperty } from '@nestjs/swagger';

export class ErrorModel {
  @ApiProperty({
    description: 'HTTP status code',
    example: 400,
  })
  statusCode: number;

  @ApiProperty({
    description: 'Detailed error message',
    example: 'Validation failed',
  })
  message: string;

  @ApiProperty({
    description: 'Error type',
    example: 'Bad Request',
  })
  error: string;
}
