import { validateUrlLikeId } from 'src/features/share/utils/validateUrlLikeId/validateUrlLikeId';

export const validateJsonFieldName = (id: string) => {
  return validateUrlLikeId(id);
};
