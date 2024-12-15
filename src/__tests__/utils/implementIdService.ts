import { DeepMockProxy } from 'jest-mock-extended';
import { nanoid } from 'nanoid';
import { IdService } from 'src/database/id.service';

export const implementIdService = (
  idService: DeepMockProxy<IdService>,
  sequenceGeneratedId: string[],
) => {
  idService.generate.mockImplementation(
    () => sequenceGeneratedId.shift() || nanoid(),
  );
};
