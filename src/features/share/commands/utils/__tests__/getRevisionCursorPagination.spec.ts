import { BadRequestException } from '@nestjs/common';
import {
  getRevisionCursorPagination,
  FindManyType,
  ResolveSequenceById,
  CursorPaginationFindManyArgs,
} from '../getRevisionCursorPagination';

type TestNode = {
  id: string;
  sequence: number;
};

describe('getRevisionCursorPagination', () => {
  describe('basic pagination', () => {
    it('should return first page without cursors', async () => {
      const result = await getRevisionCursorPagination({
        pageData: { first: 2 },
        findMany: mockFindMany,
        resolveSequenceById: mockResolveSequenceById,
        count: mockCount,
      });

      expect(result).toEqual({
        edges: [
          { cursor: '1', node: { id: '1', sequence: 1 } },
          { cursor: '2', node: { id: '2', sequence: 2 } },
        ],
        pageInfo: {
          startCursor: '1',
          endCursor: '2',
          hasNextPage: true,
          hasPreviousPage: true,
        },
        totalCount: 5,
      });
    });

    it('should return empty result when no items', async () => {
      mockCount.mockResolvedValue(0);
      mockFindMany.mockResolvedValue([]);

      const result = await getRevisionCursorPagination({
        pageData: { first: 2 },
        findMany: mockFindMany,
        resolveSequenceById: mockResolveSequenceById,
        count: mockCount,
      });

      expect(result).toEqual({
        edges: [],
        pageInfo: {
          startCursor: undefined,
          endCursor: undefined,
          hasNextPage: false,
          hasPreviousPage: false,
        },
        totalCount: 0,
      });
    });
  });

  describe('after cursor pagination', () => {
    it('should paginate after given cursor (exclusive)', async () => {
      const result = await getRevisionCursorPagination({
        pageData: { first: 2, after: '2' },
        findMany: mockFindMany,
        resolveSequenceById: mockResolveSequenceById,
        count: mockCount,
      });

      expect(mockFindMany).toHaveBeenCalledWith({
        take: 2,
        skip: 1,
        cursor: { sequence: 2 },
      });

      expect(result.edges).toHaveLength(2);
      expect(result.edges[0].node.id).toBe('3');
      expect(result.edges[1].node.id).toBe('4');
    });

    it('should throw error when after cursor not found', async () => {
      mockResolveSequenceById.mockImplementation(async (id: string) => {
        if (id === 'invalid') return 0;
        const node = mockNodes.find((n) => n.id === id);
        return node?.sequence || 0;
      });

      await expect(
        getRevisionCursorPagination({
          pageData: { first: 2, after: 'invalid' },
          findMany: mockFindMany,
          resolveSequenceById: mockResolveSequenceById,
          count: mockCount,
        }),
      ).rejects.toThrow(BadRequestException);
    });
  });

  describe('before cursor pagination', () => {
    it('should paginate before given cursor (exclusive)', async () => {
      const result = await getRevisionCursorPagination({
        pageData: { first: 2, before: '4' },
        findMany: mockFindMany,
        resolveSequenceById: mockResolveSequenceById,
        count: mockCount,
      });

      expect(mockFindMany).toHaveBeenCalledWith({
        take: -2,
        skip: 1,
        cursor: { sequence: 4 },
      });

      expect(result.edges).toHaveLength(2);
      expect(result.edges[0].node.id).toBe('2');
      expect(result.edges[1].node.id).toBe('1');
    });

    it('should throw error when before cursor not found', async () => {
      mockResolveSequenceById.mockImplementation(async (id: string) => {
        if (id === 'invalid') return 0;
        const node = mockNodes.find((n) => n.id === id);
        return node?.sequence || 0;
      });

      await expect(
        getRevisionCursorPagination({
          pageData: { first: 2, before: 'invalid' },
          findMany: mockFindMany,
          resolveSequenceById: mockResolveSequenceById,
          count: mockCount,
        }),
      ).rejects.toThrow(BadRequestException);
    });
  });

  describe('pagination info', () => {
    it('should correctly determine hasNextPage and hasPreviousPage', async () => {
      const result = await getRevisionCursorPagination({
        pageData: { first: 2, after: '2' },
        findMany: mockFindMany,
        resolveSequenceById: mockResolveSequenceById,
        count: mockCount,
      });

      expect(result.pageInfo.hasNextPage).toBe(true);
      expect(result.pageInfo.hasPreviousPage).toBe(true);
    });

    it('should set hasNextPage to false on last page', async () => {
      mockFindMany.mockImplementation(
        async ({ take, skip, cursor }: CursorPaginationFindManyArgs) => {
          if (cursor && cursor.sequence === 5 && skip === 1 && take === 1) {
            return [];
          }
          if (cursor && cursor.sequence === 4 && skip === 1) {
            return [mockNodes[4]];
          }
          return mockNodes.slice(0, 2);
        },
      );

      const result = await getRevisionCursorPagination({
        pageData: { first: 1, after: '4' },
        findMany: mockFindMany,
        resolveSequenceById: mockResolveSequenceById,
        count: mockCount,
      });

      expect(result.pageInfo.hasNextPage).toBe(false);
    });
  });

  describe('inclusive mode', () => {
    describe('after cursor inclusive', () => {
      it('should include the cursor element when inclusive=true', async () => {
        const result = await getRevisionCursorPagination({
          pageData: { first: 2, after: '2', inclusive: true },
          findMany: mockFindMany,
          resolveSequenceById: mockResolveSequenceById,
          count: mockCount,
        });

        expect(mockFindMany).toHaveBeenCalledWith({
          take: 2,
          skip: 0,
          cursor: { sequence: 2 },
        });

        expect(result.edges).toHaveLength(2);
        expect(result.edges[0].node.id).toBe('2');
        expect(result.edges[1].node.id).toBe('3');
      });

      it('should exclude the cursor element when inclusive=false', async () => {
        const result = await getRevisionCursorPagination({
          pageData: { first: 2, after: '2', inclusive: false },
          findMany: mockFindMany,
          resolveSequenceById: mockResolveSequenceById,
          count: mockCount,
        });

        expect(mockFindMany).toHaveBeenCalledWith({
          take: 2,
          skip: 1,
          cursor: { sequence: 2 },
        });

        expect(result.edges).toHaveLength(2);
        expect(result.edges[0].node.id).toBe('3');
        expect(result.edges[1].node.id).toBe('4');
      });

      it('should default to exclusive mode when inclusive is not specified', async () => {
        await getRevisionCursorPagination({
          pageData: { first: 2, after: '2' },
          findMany: mockFindMany,
          resolveSequenceById: mockResolveSequenceById,
          count: mockCount,
        });

        expect(mockFindMany).toHaveBeenCalledWith({
          take: 2,
          skip: 1,
          cursor: { sequence: 2 },
        });
      });
    });

    describe('before cursor inclusive', () => {
      it('should include the cursor element when inclusive=true', async () => {
        const result = await getRevisionCursorPagination({
          pageData: { first: 2, before: '4', inclusive: true },
          findMany: mockFindMany,
          resolveSequenceById: mockResolveSequenceById,
          count: mockCount,
        });

        expect(mockFindMany).toHaveBeenCalledWith({
          take: -2,
          skip: 0,
          cursor: { sequence: 4 },
        });

        expect(result.edges).toHaveLength(2);
        expect(result.edges[0].node.id).toBe('3');
        expect(result.edges[1].node.id).toBe('2');
      });

      it('should exclude the cursor element when inclusive=false', async () => {
        const result = await getRevisionCursorPagination({
          pageData: { first: 2, before: '4', inclusive: false },
          findMany: mockFindMany,
          resolveSequenceById: mockResolveSequenceById,
          count: mockCount,
        });

        expect(mockFindMany).toHaveBeenCalledWith({
          take: -2,
          skip: 1,
          cursor: { sequence: 4 },
        });

        expect(result.edges).toHaveLength(2);
        expect(result.edges[0].node.id).toBe('2'); // Excludes cursor element
        expect(result.edges[1].node.id).toBe('1');
      });
    });
  });

  const mockNodes: TestNode[] = [
    { id: '1', sequence: 1 },
    { id: '2', sequence: 2 },
    { id: '3', sequence: 3 },
    { id: '4', sequence: 4 },
    { id: '5', sequence: 5 },
  ];

  const mockFindMany = jest.fn() as jest.MockedFunction<FindManyType<TestNode>>;
  const mockResolveSequenceById =
    jest.fn() as jest.MockedFunction<ResolveSequenceById>;
  const mockCount = jest.fn();

  beforeEach(() => {
    jest.clearAllMocks();
    mockCount.mockResolvedValue(mockNodes.length);

    mockResolveSequenceById.mockImplementation(async (id: string) => {
      const node = mockNodes.find((n) => n.id === id);
      if (!node) return 0;
      return node.sequence;
    });

    mockFindMany.mockImplementation(
      async ({ take, skip, cursor }: CursorPaginationFindManyArgs) => {
        let startIndex = 0;

        if (cursor) {
          const cursorIndex = mockNodes.findIndex(
            (n) => n.sequence === cursor.sequence,
          );
          if (cursorIndex === -1) return [];

          if (take > 0) {
            startIndex = cursorIndex + skip;
          } else {
            const itemsToTake = Math.abs(take);
            startIndex = Math.max(0, cursorIndex - skip - itemsToTake);
          }
        } else if (take < 0) {
          const itemsToTake = Math.abs(take);
          startIndex = Math.max(0, mockNodes.length - itemsToTake);
        }

        const actualTake = Math.abs(take);
        const endIndex = startIndex + actualTake;
        const result = mockNodes.slice(startIndex, endIndex);

        return take < 0 ? result.reverse() : result;
      },
    );
  });
});
