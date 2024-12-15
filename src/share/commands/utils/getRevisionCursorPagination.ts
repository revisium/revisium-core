import { IPaginatedType } from 'src/share/pagination.interface';

type NodeType = { id: string; sequence: number };

type CursorType =
  | {
      sequence: number;
    }
  | undefined;

type PageDataType = { readonly first: number; after?: string; before?: string };

export type CursorPaginationFindManyArgs = {
  take: number;
  skip: number;
  cursor: CursorType;
};

export type FindManyType<T> = (
  args: CursorPaginationFindManyArgs,
) => Promise<T[]>;

export type ResolveSequenceById = (id: string) => Promise<number>;

type CountType = () => Promise<number>;

type GetPaginationArgsType<T> = {
  pageData: PageDataType;
  findMany: FindManyType<T>;
  resolveSequenceById: ResolveSequenceById;
  count: CountType;
};

export async function getRevisionCursorPagination<T extends NodeType>({
  pageData,
  findMany,
  resolveSequenceById,
  count,
}: GetPaginationArgsType<T>): Promise<IPaginatedType<T>> {
  const totalCount = await count();

  if (pageData.after && !(await resolveSequenceById(pageData.after))) {
    throw new Error('Not found after');
  }

  if (pageData.before && !(await resolveSequenceById(pageData.before))) {
    throw new Error('Not found before');
  }

  const items = await findMany(
    await resolveArgs(resolveSequenceById, pageData),
  );

  const endNode: NodeType | undefined = items[items.length - 1];
  const startNode: NodeType | undefined = items[0];

  const hasNextPage = endNode
    ? await isThereItem({
        findMany,
        sequence: endNode.sequence,
        take: 1,
        skip: 1,
      })
    : false;
  const hasPreviousPage = startNode
    ? await isThereItem({
        findMany,
        sequence: startNode.sequence,
        take: -1,
        skip: 1,
      })
    : false;

  return {
    edges: items.map((item) => ({
      cursor: item.id.toString(),
      node: item,
    })),
    pageInfo: {
      startCursor: startNode?.id.toString(),
      endCursor: endNode?.id.toString(),
      hasNextPage,
      hasPreviousPage,
    },
    totalCount,
  };
}

const isThereItem = async ({
  findMany,
  take,
  sequence,
  skip,
}: {
  findMany: FindManyType<unknown>;
  sequence: number;
  take: number;
  skip: number;
}) => {
  const items = await findMany({
    take,
    skip,
    cursor: {
      sequence,
    },
  });

  return Boolean(items.length);
};

const resolveArgs = async (
  resolveSequenceById: ResolveSequenceById,
  pageData: PageDataType,
): Promise<CursorPaginationFindManyArgs> => {
  let take = pageData.first;
  let skip = 0;
  let cursor: CursorType = undefined;

  if (pageData.after) {
    skip = 1;
    cursor = { sequence: await resolveSequenceById(pageData.after) };
  } else if (pageData.before) {
    take = -pageData.first;
    skip = 1;
    cursor = { sequence: await resolveSequenceById(pageData.before) };
  }

  return { take, skip, cursor };
};
