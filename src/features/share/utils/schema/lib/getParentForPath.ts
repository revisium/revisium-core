export const getParentForPath = (
  path: string,
): { parentPath: string; field: string } => {
  if (path === '' || path === '/') {
    throw new Error('Invalid path');
  }

  const tokens = path.split('/');
  tokens.shift();

  let currentToken = tokens.shift();

  let parentPath = '';
  let field = '';

  while (currentToken) {
    if (currentToken === 'properties') {
      currentToken = tokens.shift();

      if (!currentToken) {
        throw new Error('Invalid path');
      }

      field = currentToken;

      currentToken = tokens.shift();

      if (currentToken) {
        parentPath = `${parentPath}/properties/${field}`;
      }
    } else if (currentToken === 'items') {
      field = currentToken;

      currentToken = tokens.shift();

      if (currentToken && !['items', 'properties'].includes(currentToken)) {
        throw new Error('Invalid path');
      } else if (currentToken) {
        parentPath = `${parentPath}/items`;
      }
    } else {
      throw new Error('Invalid path');
    }
  }

  return {
    parentPath: parentPath,
    field,
  };
};
