import { Prisma } from '@prisma/client';
import { SearchMatch } from 'src/features/row/queries/impl';

export function extractMatchesFallback(
  data: Prisma.JsonValue,
  query: string,
): SearchMatch[] {
  const matches: { match: SearchMatch; relevance: number }[] = [];

  const queryTokens = query
    .toLowerCase()
    .split(/[\s_-]+/)
    .filter((t) => t.length > 0);

  const searchInObject = (obj: any, path: string = '') => {
    if (obj === null || obj === undefined) {
      return;
    }

    if (typeof obj === 'string') {
      const lowerValue = obj.toLowerCase();
      const valueTokens = lowerValue
        .split(/[\s_-]+/)
        .filter((t) => t.length > 0);

      const hasMatch = queryTokens.some((queryToken) =>
        valueTokens.some((valueToken) => valueToken.includes(queryToken)),
      );

      if (hasMatch) {
        let relevance = 0;
        const exactMatch = queryTokens.every((queryToken) =>
          valueTokens.some((valueToken) => valueToken === queryToken),
        );
        const startsWithMatch = queryTokens.some((queryToken) =>
          valueTokens.some((valueToken) => valueToken.startsWith(queryToken)),
        );

        if (exactMatch) {
          relevance = 100;
        } else if (startsWithMatch) {
          relevance = 50;
        } else {
          relevance = 10;
        }

        relevance += Math.max(0, 20 - obj.length);

        matches.push({
          match: {
            path: path || 'data',
            value: obj,
            highlight: highlightText(obj, queryTokens),
          },
          relevance,
        });
      }
    } else if (typeof obj === 'number' || typeof obj === 'boolean') {
      const stringValue = String(obj);
      const lowerValue = stringValue.toLowerCase();
      if (queryTokens.some((token) => lowerValue.includes(token))) {
        matches.push({
          match: {
            path: path || 'data',
            value: stringValue,
            highlight: highlightText(stringValue, queryTokens),
          },
          relevance: 30,
        });
      }
    } else if (typeof obj === 'object') {
      if (Array.isArray(obj)) {
        obj.forEach((item, index) => {
          searchInObject(item, path ? `${path}[${index}]` : `[${index}]`);
        });
      } else {
        Object.entries(obj).forEach(([key, value]) => {
          searchInObject(value, path ? `${path}.${key}` : key);
        });
      }
    }
  };

  searchInObject(data);

  return matches
    .sort((a, b) => b.relevance - a.relevance)
    .slice(0, 5)
    .map((item) => item.match);
}

function highlightText(text: string, terms: string[]): string {
  let highlighted = text;
  terms.forEach((term) => {
    const regex = new RegExp(`(${term})`, 'gi');
    highlighted = highlighted.replace(regex, '<mark>$1</mark>');
  });
  return highlighted;
}
