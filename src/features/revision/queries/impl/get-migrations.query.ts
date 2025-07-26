import { JsonPatch } from 'src/features/share/utils/schema/types/json-patch.types';

export class GetMigrationsQuery {
  constructor(
    public readonly data: {
      readonly revisionId: string;
    },
  ) {}
}

export type GetMigrationsQueryData = GetMigrationsQuery['data'];

export type GetMigrationsQueryReturnType = [
  { patches: JsonPatch[]; hash: string; tableId: string; date: string },
];
