import { DeepMockProxy } from 'jest-mock-extended';
import { nanoid } from 'nanoid';
import { IdService } from '@revisium/engine';

export const implementIdService = (
  idService: DeepMockProxy<IdService>,
  sequenceGeneratedId: string[],
) => {
  idService.generate.mockImplementation(
    () => sequenceGeneratedId.shift() || nanoid(),
  );
};
