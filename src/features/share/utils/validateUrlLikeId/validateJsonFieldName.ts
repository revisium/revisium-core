export { VALIDATE_URL_LIKE_ID_ERROR_MESSAGE as VALIDATE_JSON_FIELD_NAME_ERROR_MESSAGE } from 'src/features/share/utils/validateUrlLikeId/validateUrlLikeId';

const validPattern = /^(?!__)[a-zA-Z_][a-zA-Z0-9-_]*$/;
const maxLength = 64;

export const validateJsonFieldName = (id: string) => {
  const isInvalid =
    id.length < 1 || id.length > maxLength || !validPattern.test(id);

  return !isInvalid;
};
