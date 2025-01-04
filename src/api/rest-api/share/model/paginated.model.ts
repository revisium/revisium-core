import { ApiProperty } from '@nestjs/swagger';
import { Type } from '@nestjs/common';

export class PageInfo {
  @ApiProperty({
    required: false,
  })
  endCursor?: string;

  @ApiProperty()
  hasNextPage: boolean;

  @ApiProperty()
  hasPreviousPage: boolean;

  @ApiProperty({
    required: false,
  })
  startCursor?: string;
}

export function Paginated<T>(classRef: Type<T>, name: string): Type<any> {
  class EdgeType {
    @ApiProperty()
    cursor: string;

    @ApiProperty({ type: classRef })
    node: T;
  }

  Object.defineProperty(EdgeType, 'name', { value: `${name}EdgeType` });

  class PaginatedType {
    @ApiProperty({ type: [EdgeType] })
    edges: EdgeType[];

    @ApiProperty()
    totalCount: number;

    @ApiProperty()
    pageInfo: PageInfo;
  }

  Object.defineProperty(PaginatedType, 'name', {
    value: `${name}PaginatedType`,
  });

  return PaginatedType as Type<any>;
}
