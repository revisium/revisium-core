import {
  VALIDATE_URL_LIKE_ID_ERROR_MESSAGE,
  validateUrlLikeId,
} from 'src/features/share/utils/validateUrlLikeId/validateUrlLikeId';

export const VALIDATE_JSON_FIELD_NAME_ERROR_MESSAGE =
  VALIDATE_URL_LIKE_ID_ERROR_MESSAGE;

export const validateJsonFieldName = (id: string) => {
  return validateUrlLikeId(id);
};
