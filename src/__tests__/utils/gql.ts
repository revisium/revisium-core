export const gql = (
  chunks: TemplateStringsArray,
  ...variables: unknown[]
): string => {
  return chunks.reduce(
    (acc, chunk, index) =>
      `${acc}${chunk}${index in variables ? String(variables[index]) : ``}`,
    ``,
  );
};
