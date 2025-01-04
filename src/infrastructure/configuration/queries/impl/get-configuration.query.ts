export class GetConfigurationQuery {
  constructor() {}
}

export type GetConfigurationQueryReturnType = {
  availableEmailSignUp: boolean;
  google: { available: boolean; clientId?: string };
  github: { available: boolean; clientId?: string };
};
