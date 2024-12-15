import { DeepMockProxy, mockDeep } from 'jest-mock-extended';
import { DraftTransactionalCommands } from 'src/draft/draft.transactional.commands';

export const createRowMocks = () => {
  const rowTransactionalCommands: DeepMockProxy<DraftTransactionalCommands> =
    mockDeep<DraftTransactionalCommands>();

  return {
    rowTransactionalCommands,
  };
};
