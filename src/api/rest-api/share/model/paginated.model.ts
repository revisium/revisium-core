import { ApiProperty } from '@nestjs/swagger';
import { Type } from '@nestjs/common';

export class PageInfo {
  @ApiProperty({
    description: 'Cursor pointing to the last item. Use as "after" parameter for next page.',
    required: false,
    example: 'eyJpZCI6IjEyMyJ9',
  })
  endCursor?: string;

  @ApiProperty({
    description: 'Whether more items exist after the current page',
  })
  hasNextPage: boolean;

  @ApiProperty({
    description: 'Whether items exist before the current page',
  })
  hasPreviousPage: boolean;

  @ApiProperty({
    description: 'Cursor pointing to the first item',
    required: false,
    example: 'eyJpZCI6IjEifQ',
  })
  startCursor?: string;
}

export function Paginated<T>(classRef: Type<T>, name: string): Type<any> {
  class EdgeType {
    @ApiProperty({
      description: 'Cursor for this specific item',
      example: 'eyJpZCI6IjEyMyJ9',
    })
    cursor: string;

    @ApiProperty({ type: classRef })
    node: T;
  }

  Object.defineProperty(EdgeType, 'name', { value: `${name}EdgeType` });

  class PaginatedType {
    @ApiProperty({ type: [EdgeType], description: 'List of items with cursors' })
    edges: EdgeType[];

    @ApiProperty({ description: 'Total number of items available' })
    totalCount: number;

    @ApiProperty({ description: 'Pagination metadata' })
    pageInfo: PageInfo;
  }

  Object.defineProperty(PaginatedType, 'name', {
    value: `${name}PaginatedType`,
  });

  return PaginatedType as Type<any>;
}
