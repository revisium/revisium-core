export type CreateRevisionHandlerReturnType = {
  previousHeadRevisionId: string;
  previousDraftRevisionId: string;
  nextDraftRevisionId: string;
  draftEndpoints: string[];
  headEndpoints: string[];
};
