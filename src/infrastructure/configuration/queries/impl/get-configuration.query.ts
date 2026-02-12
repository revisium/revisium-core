export class GetConfigurationQuery {}

export type GetConfigurationQueryReturnType = {
  availableEmailSignUp: boolean;
  noAuth: boolean;
  google: { available: boolean; clientId?: string };
  github: { available: boolean; clientId?: string };
  plugins: {
    file: boolean;
    formula: boolean;
  };
};
