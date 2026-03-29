import { SetMetadata } from '@nestjs/common';

export const EE_FEATURE_KEY = 'ee_feature';

export const EeFeature = (feature: string) =>
  SetMetadata(EE_FEATURE_KEY, feature);
