import { IPaginatedType } from 'src/features/share/pagination.interface';
import { RowWithContext } from 'src/features/share/types/row-with-context.types';

export type GetTableRowsReturnType = IPaginatedType<RowWithContext>;
