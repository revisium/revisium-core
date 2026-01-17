import { Prisma } from 'src/__generated__/client';
import { FormulaFieldError } from 'src/features/plugin/types';

export type RowWithContext = Prisma.RowGetPayload<Prisma.RowDefaultArgs> & {
  context: { revisionId: string; tableId: string };
  formulaErrors?: FormulaFieldError[];
};
