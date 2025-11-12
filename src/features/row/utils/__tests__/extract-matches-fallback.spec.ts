import { extractMatchesFallback } from '../extract-matches-fallback';

describe('extractMatchesFallback', () => {
  describe('simple string matching', () => {
    it('should find matches in string values', () => {
      const data = {
        title: 'Hello World',
        description: 'This is a test description',
      };

      const matches = extractMatchesFallback(data, 'Hello');

      expect(matches).toHaveLength(1);
      expect(matches[0]).toEqual({
        path: 'title',
        value: 'Hello World',
        highlight: '<mark>Hello</mark> World',
      });
    });

    it('should find matches case-insensitively', () => {
      const data = {
        name: 'John Doe',
        email: 'john@example.com',
      };

      const matches = extractMatchesFallback(data, 'john');

      expect(matches).toHaveLength(2);
      expect(matches).toContainEqual({
        path: 'name',
        value: 'John Doe',
        highlight: '<mark>John</mark> Doe',
      });
      expect(matches).toContainEqual({
        path: 'email',
        value: 'john@example.com',
        highlight: '<mark>john</mark>@example.com',
      });
    });

    it('should find partial matches', () => {
      const data = {
        content: 'The quick brown fox',
        tags: 'animals, nature',
      };

      const matches = extractMatchesFallback(data, 'ick');

      expect(matches).toHaveLength(1);
      expect(matches[0]).toEqual({
        path: 'content',
        value: 'The quick brown fox',
        highlight: 'The qu<mark>ick</mark> brown fox',
      });
    });
  });

  describe('nested object handling', () => {
    it('should find matches in nested objects', () => {
      const data = {
        user: {
          name: 'Alice',
          profile: {
            bio: 'Software developer',
          },
        },
      };

      const matches = extractMatchesFallback(data, 'developer');

      expect(matches).toHaveLength(1);
      expect(matches[0]).toEqual({
        path: 'user.profile.bio',
        value: 'Software developer',
        highlight: 'Software <mark>developer</mark>',
      });
    });

    it('should handle deeply nested structures', () => {
      const data = {
        level1: {
          level2: {
            level3: {
              value: 'Deep value here',
            },
          },
        },
      };

      const matches = extractMatchesFallback(data, 'Deep');

      expect(matches).toHaveLength(1);
      expect(matches[0]).toEqual({
        path: 'level1.level2.level3.value',
        value: 'Deep value here',
        highlight: '<mark>Deep</mark> value here',
      });
    });
  });

  describe('array handling', () => {
    it('should find matches in array elements', () => {
      const data = {
        items: ['apple', 'banana', 'cherry'],
      };

      const matches = extractMatchesFallback(data, 'ban');

      expect(matches).toHaveLength(1);
      expect(matches[0]).toEqual({
        path: 'items[1]',
        value: 'banana',
        highlight: '<mark>ban</mark>ana',
      });
    });

    it('should find matches in array of objects', () => {
      const data = {
        users: [
          { id: 1, name: 'Alice' },
          { id: 2, name: 'Bob' },
          { id: 3, name: 'Charlie' },
        ],
      };

      const matches = extractMatchesFallback(data, 'Bob');

      expect(matches).toHaveLength(1);
      expect(matches[0]).toEqual({
        path: 'users[1].name',
        value: 'Bob',
        highlight: '<mark>Bob</mark>',
      });
    });

    it('should find multiple matches in arrays', () => {
      const data = {
        tags: ['javascript', 'typescript', 'script'],
      };

      const matches = extractMatchesFallback(data, 'script');

      expect(matches).toHaveLength(3);
      expect(matches).toContainEqual({
        path: 'tags[0]',
        value: 'javascript',
        highlight: 'java<mark>script</mark>',
      });
      expect(matches).toContainEqual({
        path: 'tags[1]',
        value: 'typescript',
        highlight: 'type<mark>script</mark>',
      });
      expect(matches).toContainEqual({
        path: 'tags[2]',
        value: 'script',
        highlight: '<mark>script</mark>',
      });
    });
  });

  describe('special value handling', () => {
    it('should handle number to string conversion', () => {
      const data = {
        age: 25,
        year: 2024,
      };

      const matches = extractMatchesFallback(data, '25');

      expect(matches).toHaveLength(1);
      expect(matches[0]).toEqual({
        path: 'age',
        value: '25',
        highlight: '<mark>25</mark>',
      });
    });

    it('should handle boolean values', () => {
      const data = {
        isActive: true,
        isEnabled: false,
      };

      const matches = extractMatchesFallback(data, 'true');

      expect(matches).toHaveLength(1);
      expect(matches[0]).toEqual({
        path: 'isActive',
        value: 'true',
        highlight: '<mark>true</mark>',
      });
    });

    it('should skip null and undefined values', () => {
      const data = {
        name: 'John',
        middleName: null,
        lastName: undefined,
      };

      const matches = extractMatchesFallback(data, 'null');

      expect(matches).toHaveLength(0);
    });

    it('should handle empty strings', () => {
      const data = {
        title: 'Test',
        description: '',
      };

      const matches = extractMatchesFallback(data, '');

      expect(matches).toHaveLength(0);
    });
  });

  describe('edge cases', () => {
    it('should handle empty objects', () => {
      const data = {};

      const matches = extractMatchesFallback(data, 'test');

      expect(matches).toHaveLength(0);
    });

    it('should handle empty query', () => {
      const data = {
        title: 'Test',
      };

      const matches = extractMatchesFallback(data, '');

      expect(matches).toHaveLength(0);
    });

    it('should handle null data', () => {
      const matches = extractMatchesFallback(null, 'test');

      expect(matches).toHaveLength(0);
    });

    it('should handle undefined data', () => {
      const matches = extractMatchesFallback(undefined as any, 'test');

      expect(matches).toHaveLength(0);
    });

    it('should handle string data at root level', () => {
      const matches = extractMatchesFallback('string data', 'string');

      expect(matches).toHaveLength(1);
      expect(matches[0]).toEqual({
        path: 'data',
        value: 'string data',
        highlight: '<mark>string</mark> data',
      });
    });

    it('should handle special characters in query', () => {
      const data = {
        email: 'user@example.com',
        code: 'function() { return true; }',
      };

      const matches = extractMatchesFallback(data, '@example');

      expect(matches).toHaveLength(1);
      expect(matches[0]).toEqual({
        path: 'email',
        value: 'user@example.com',
        highlight: 'user<mark>@example</mark>.com',
      });
    });
  });

  describe('sorting and relevance', () => {
    it('should sort matches with exact matches first', () => {
      const data = {
        exactMatch: 'test',
        partialMatch: 'testing',
        anotherPartial: 'test case',
      };

      const matches = extractMatchesFallback(data, 'test');

      expect(matches).toHaveLength(3);
      expect(matches[0].path).toBe('exactMatch');
    });

    it('should limit results to 5 matches', () => {
      const data = {
        field1: 'match',
        field2: 'match',
        field3: 'match',
        field4: 'match',
        field5: 'match',
        field6: 'match',
      };

      const matches = extractMatchesFallback(data, 'match');

      expect(matches).toHaveLength(5);
    });

    it('should handle multiple words in query', () => {
      const data = {
        title: 'The quick brown fox',
        description: 'Jumps over the lazy dog',
      };

      const matches = extractMatchesFallback(data, 'quick brown');

      expect(matches).toHaveLength(1);
      expect(matches[0]).toEqual({
        path: 'title',
        value: 'The quick brown fox',
        highlight: 'The <mark>quick</mark> <mark>brown</mark> fox',
      });
    });
  });

  describe('complex real-world scenarios', () => {
    it('should handle CMS-like content structure', () => {
      const data = {
        id: '123',
        title: 'Blog Post Title',
        content: {
          blocks: [
            { type: 'heading', text: 'Introduction' },
            { type: 'paragraph', text: 'This is the blog content' },
          ],
        },
        meta: {
          author: 'John Doe',
          tags: ['technology', 'programming'],
        },
      };

      const matches = extractMatchesFallback(data, 'blog');

      expect(matches).toHaveLength(2);
      const paths = matches.map((m) => m.path);
      expect(paths).toContain('title');
      expect(paths).toContain('content.blocks[1].text');
    });

    it('should handle product catalog structure', () => {
      const data = {
        product: {
          name: 'Laptop',
          specs: {
            processor: 'Intel Core i7',
            memory: '16GB RAM',
            storage: '512GB SSD',
          },
          categories: ['Electronics', 'Computers', 'Laptops'],
        },
      };

      const matches = extractMatchesFallback(data, 'Intel');

      expect(matches).toHaveLength(1);
      expect(matches[0]).toEqual({
        path: 'product.specs.processor',
        value: 'Intel Core i7',
        highlight: '<mark>Intel</mark> Core i7',
      });
    });
  });
});
