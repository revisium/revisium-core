import { Prisma } from 'src/__generated__/client';
import { SearchMatch } from 'src/features/row/queries/impl';

interface MatchWithRelevance {
  match: SearchMatch;
  relevance: number;
}

export function extractMatchesFallback(
  data: Prisma.JsonValue,
  query: string,
): SearchMatch[] {
  const matches: MatchWithRelevance[] = [];

  const queryTokens = query
    .toLowerCase()
    .split(/[\s_-]+/)
    .filter((t) => t.length > 0);

  searchInObject(data, '', queryTokens, matches);

  matches.sort((a, b) => b.relevance - a.relevance);
  return matches.slice(0, 5).map((item) => item.match);
}

function searchInObject(
  obj: any,
  path: string,
  queryTokens: string[],
  matches: MatchWithRelevance[],
): void {
  if (obj === null || obj === undefined) {
    return;
  }

  if (typeof obj === 'string') {
    handleStringMatch(obj, path, queryTokens, matches);
  } else if (typeof obj === 'number' || typeof obj === 'boolean') {
    handlePrimitiveMatch(obj, path, queryTokens, matches);
  } else if (Array.isArray(obj)) {
    obj.forEach((item, index) => {
      searchInObject(
        item,
        path ? `${path}[${index}]` : `[${index}]`,
        queryTokens,
        matches,
      );
    });
  } else if (typeof obj === 'object') {
    Object.entries(obj).forEach(([key, value]) => {
      searchInObject(
        value,
        path ? `${path}.${key}` : key,
        queryTokens,
        matches,
      );
    });
  }
}

function handleStringMatch(
  value: string,
  path: string,
  queryTokens: string[],
  matches: MatchWithRelevance[],
): void {
  const lowerValue = value.toLowerCase();
  const valueTokens = lowerValue.split(/[\s_-]+/).filter((t) => t.length > 0);

  const hasMatch = queryTokens.some((queryToken) =>
    valueTokens.some((valueToken) => valueToken.includes(queryToken)),
  );

  if (!hasMatch) {
    return;
  }

  const relevance = calculateRelevance(value, queryTokens, valueTokens);
  matches.push({
    match: {
      path: path || 'data',
      value,
      highlight: highlightText(value, queryTokens),
    },
    relevance,
  });
}

function calculateRelevance(
  value: string,
  queryTokens: string[],
  valueTokens: string[],
): number {
  const exactMatch = queryTokens.every((queryToken) =>
    valueTokens.includes(queryToken),
  );
  if (exactMatch) {
    return 100 + Math.max(0, 20 - value.length);
  }

  const startsWithMatch = queryTokens.some((queryToken) =>
    valueTokens.some((valueToken) => valueToken.startsWith(queryToken)),
  );
  if (startsWithMatch) {
    return 50 + Math.max(0, 20 - value.length);
  }

  return 10 + Math.max(0, 20 - value.length);
}

function handlePrimitiveMatch(
  value: number | boolean,
  path: string,
  queryTokens: string[],
  matches: MatchWithRelevance[],
): void {
  const stringValue = String(value);
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
}

function escapeRegExp(string: string): string {
  return string.replace(/[.*+?^${}()|[\]\\]/g, String.raw`\$&`);
}

function highlightText(text: string, terms: string[]): string {
  let highlighted = text;
  terms.forEach((term) => {
    const escapedTerm = escapeRegExp(term);
    const regex = new RegExp(`(${escapedTerm})`, 'gi');
    highlighted = highlighted.replace(regex, '<mark>$1</mark>');
  });
  return highlighted;
}
