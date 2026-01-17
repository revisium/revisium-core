import { Row } from 'src/__generated__/client';
import { RowModel } from 'src/api/rest-api/row/model';
import { FormulaFieldError } from 'src/features/plugin/types';
import { IPaginatedType } from 'src/features/share/pagination.interface';

type RowWithFormulaErrors = Row & {
  formulaErrors?: FormulaFieldError[];
};

export const transformFromPrismaToRowModel = (
  data: RowWithFormulaErrors,
): RowModel => {
  return {
    createdId: data.createdId,
    id: data.id,
    versionId: data.versionId,
    createdAt: data.createdAt,
    updatedAt: data.updatedAt,
    publishedAt: data.publishedAt,
    readonly: data.readonly,
    data: data.data,
    formulaErrors:
      data.formulaErrors && data.formulaErrors.length > 0
        ? data.formulaErrors
        : undefined,
  };
};

export const transformFromPaginatedPrismaToRowModel = ({
  pageInfo,
  totalCount,
  edges,
}: IPaginatedType<RowWithFormulaErrors>): IPaginatedType<RowModel> => {
  return {
    pageInfo,
    totalCount,
    edges: edges.map((edge) => ({
      cursor: edge.cursor,
      node: transformFromPrismaToRowModel(edge.node),
    })),
  };
};
