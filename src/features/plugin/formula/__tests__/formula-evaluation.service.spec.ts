import {
  evaluate,
  buildDependencyGraph,
  getTopologicalOrder,
  extractSchemaFormulas,
  parseFormula,
} from '@revisium/formula';

const createSchema = (
  fields: Record<string, { type: string; default: unknown; formula?: string }>,
) => ({
  type: 'object',
  properties: Object.fromEntries(
    Object.entries(fields).map(([name, config]) => [
      name,
      {
        type: config.type,
        default: config.default,
        ...(config.formula && {
          readOnly: true,
          'x-formula': { version: 1, expression: config.formula },
        }),
      },
    ]),
  ),
  additionalProperties: false,
  required: Object.keys(fields),
});

describe('FormulaEvaluation', () => {
  describe('evaluate function (from @revisium/formula)', () => {
    describe('simple arithmetic', () => {
      it('should evaluate price * quantity', () => {
        const result = evaluate('price * quantity', { price: 10, quantity: 5 });
        expect(result).toBe(50);
      });

      it('should evaluate addition', () => {
        const result = evaluate('a + b + c', { a: 1, b: 2, c: 3 });
        expect(result).toBe(6);
      });

      it('should evaluate subtraction', () => {
        const result = evaluate('total - discount', {
          total: 100,
          discount: 15,
        });
        expect(result).toBe(85);
      });

      it('should evaluate division', () => {
        const result = evaluate('total / count', { total: 100, count: 4 });
        expect(result).toBe(25);
      });

      it('should evaluate modulo', () => {
        const result = evaluate('value % 3', { value: 10 });
        expect(result).toBe(1);
      });

      it('should evaluate unary minus', () => {
        const result = evaluate('-value', { value: 42 });
        expect(result).toBe(-42);
      });

      it('should evaluate complex arithmetic', () => {
        const result = evaluate('(price * quantity) + tax - discount', {
          price: 10,
          quantity: 5,
          tax: 5,
          discount: 10,
        });
        expect(result).toBe(45);
      });
    });

    describe('chained formulas (topological order)', () => {
      it('should evaluate a → b → c chain', () => {
        const data: Record<string, unknown> = { base: 100 };

        data['doubled'] = evaluate('base * 2', data);
        data['tripled'] = evaluate('doubled + base', data);

        expect(data['doubled']).toBe(200);
        expect(data['tripled']).toBe(300);
      });

      it('should evaluate complex dependency chain', () => {
        const data: Record<string, unknown> = {
          costPrice: 100,
          markup: 1.3,
          taxRate: 0.2,
          discountPercent: 10,
        };

        data['basePrice'] = evaluate('costPrice * markup', data);
        data['discountAmount'] = evaluate(
          'basePrice * discountPercent / 100',
          data,
        );
        data['priceBeforeTax'] = evaluate('basePrice - discountAmount', data);
        data['taxAmount'] = evaluate('priceBeforeTax * taxRate', data);
        data['finalPrice'] = evaluate('priceBeforeTax + taxAmount', data);

        expect(data['basePrice']).toBe(130);
        expect(data['discountAmount']).toBe(13);
        expect(data['priceBeforeTax']).toBe(117);
        expect(data['taxAmount']).toBeCloseTo(23.4);
        expect(data['finalPrice']).toBeCloseTo(140.4);
      });
    });

    describe('multiple independent formulas', () => {
      it('should evaluate independent formulas in any order', () => {
        const data: Record<string, unknown> = { a: 10, b: 20, c: 30 };

        data['sumAB'] = evaluate('a + b', data);
        data['sumBC'] = evaluate('b + c', data);
        data['sumAC'] = evaluate('a + c', data);

        expect(data['sumAB']).toBe(30);
        expect(data['sumBC']).toBe(50);
        expect(data['sumAC']).toBe(40);
      });
    });

    describe('error handling', () => {
      it('should handle division by zero', () => {
        const result = evaluate('price / quantity', {
          price: 100,
          quantity: 0,
        });
        expect(result).toBe(Infinity);
      });

      it('should handle NaN from invalid arithmetic', () => {
        const result = evaluate('0 / 0', {});
        expect(Number.isNaN(result)).toBe(true);
      });

      it('should handle undefined field as undefined', () => {
        const result = evaluate('price * 2', {});
        expect(Number.isNaN(result as number)).toBe(true);
      });

      it('should handle null field', () => {
        const result = evaluate('price * 2', { price: null });
        expect(result).toBe(0);
      });

      it('should throw on empty expression', () => {
        expect(() => evaluate('', {})).toThrow('Empty expression');
      });
    });

    describe('boolean formulas', () => {
      it('should evaluate comparison', () => {
        expect(evaluate('price > 100', { price: 150 })).toBe(true);
        expect(evaluate('price > 100', { price: 50 })).toBe(false);
      });

      it('should evaluate equality', () => {
        expect(evaluate('status == "active"', { status: 'active' })).toBe(true);
        expect(evaluate('status == "active"', { status: 'inactive' })).toBe(
          false,
        );
      });

      it('should evaluate logical AND', () => {
        expect(evaluate('a > 0 && b > 0', { a: 5, b: 3 })).toBe(true);
        expect(evaluate('a > 0 && b > 0', { a: 5, b: -1 })).toBe(false);
      });

      it('should evaluate logical OR', () => {
        expect(evaluate('a > 10 || b > 10', { a: 5, b: 15 })).toBe(true);
        expect(evaluate('a > 10 || b > 10', { a: 5, b: 3 })).toBe(false);
      });

      it('should evaluate logical NOT', () => {
        expect(evaluate('!active', { active: false })).toBe(true);
        expect(evaluate('!active', { active: true })).toBe(false);
      });

      it('should evaluate complex boolean', () => {
        const result = evaluate('(price > 100 && inStock) || isVip', {
          price: 150,
          inStock: true,
          isVip: false,
        });
        expect(result).toBe(true);
      });
    });

    describe('string formulas', () => {
      it('should concatenate with concat function', () => {
        const result = evaluate('concat(firstName, " ", lastName)', {
          firstName: 'John',
          lastName: 'Doe',
        });
        expect(result).toBe('John Doe');
      });

      it('should evaluate upper function', () => {
        const result = evaluate('upper(name)', { name: 'hello' });
        expect(result).toBe('HELLO');
      });

      it('should evaluate lower function', () => {
        const result = evaluate('lower(name)', { name: 'HELLO' });
        expect(result).toBe('hello');
      });

      it('should evaluate trim function', () => {
        const result = evaluate('trim(name)', { name: '  hello  ' });
        expect(result).toBe('hello');
      });

      it('should evaluate length function', () => {
        const result = evaluate('length(name)', { name: 'hello' });
        expect(result).toBe(5);
      });

      it('should evaluate contains function', () => {
        expect(
          evaluate('contains(text, "world")', { text: 'hello world' }),
        ).toBe(true);
        expect(evaluate('contains(text, "foo")', { text: 'hello world' })).toBe(
          false,
        );
      });

      it('should evaluate startswith function', () => {
        expect(
          evaluate('startswith(text, "hello")', { text: 'hello world' }),
        ).toBe(true);
        expect(
          evaluate('startswith(text, "world")', { text: 'hello world' }),
        ).toBe(false);
      });

      it('should evaluate endswith function', () => {
        expect(
          evaluate('endswith(text, "world")', { text: 'hello world' }),
        ).toBe(true);
        expect(
          evaluate('endswith(text, "hello")', { text: 'hello world' }),
        ).toBe(false);
      });

      it('should evaluate replace function', () => {
        const result = evaluate('replace(text, "world", "universe")', {
          text: 'hello world',
        });
        expect(result).toBe('hello universe');
      });
    });

    describe('math functions', () => {
      it('should evaluate round function', () => {
        expect(evaluate('round(3.7)', {})).toBe(4);
        expect(evaluate('round(3.14159, 2)', {})).toBe(3.14);
      });

      it('should evaluate floor function', () => {
        expect(evaluate('floor(3.9)', {})).toBe(3);
        expect(evaluate('floor(-3.1)', {})).toBe(-4);
      });

      it('should evaluate ceil function', () => {
        expect(evaluate('ceil(3.1)', {})).toBe(4);
        expect(evaluate('ceil(-3.9)', {})).toBe(-3);
      });

      it('should evaluate abs function', () => {
        expect(evaluate('abs(-5)', {})).toBe(5);
        expect(evaluate('abs(5)', {})).toBe(5);
      });

      it('should evaluate sqrt function', () => {
        expect(evaluate('sqrt(16)', {})).toBe(4);
        expect(evaluate('sqrt(2)', {})).toBeCloseTo(1.414, 3);
      });

      it('should evaluate pow function', () => {
        expect(evaluate('pow(2, 3)', {})).toBe(8);
        expect(evaluate('pow(10, 2)', {})).toBe(100);
      });

      it('should evaluate min function', () => {
        expect(evaluate('min(5, 3, 8, 1)', {})).toBe(1);
        expect(evaluate('min(a, b)', { a: 10, b: 5 })).toBe(5);
      });

      it('should evaluate max function', () => {
        expect(evaluate('max(5, 3, 8, 1)', {})).toBe(8);
        expect(evaluate('max(a, b)', { a: 10, b: 5 })).toBe(10);
      });
    });

    describe('conditional functions', () => {
      it('should evaluate if function', () => {
        expect(
          evaluate('if(x > 0, "positive", "non-positive")', { x: 5 }),
        ).toBe('positive');
        expect(
          evaluate('if(x > 0, "positive", "non-positive")', { x: -5 }),
        ).toBe('non-positive');
      });

      it('should evaluate nested if', () => {
        const grade = (score: number) =>
          evaluate(
            'if(score >= 90, "A", if(score >= 80, "B", if(score >= 70, "C", "F")))',
            { score },
          );

        expect(grade(95)).toBe('A');
        expect(grade(85)).toBe('B');
        expect(grade(75)).toBe('C');
        expect(grade(60)).toBe('F');
      });

      it('should evaluate coalesce function', () => {
        expect(
          evaluate('coalesce(a, b, c)', { a: null, b: null, c: 'default' }),
        ).toBe('default');
        expect(evaluate('coalesce(a, b)', { a: 'first', b: 'second' })).toBe(
          'first',
        );
      });

      it('should evaluate isnull function', () => {
        expect(evaluate('isnull(value)', { value: null })).toBe(true);
        expect(evaluate('isnull(value)', { value: undefined })).toBe(true);
        expect(evaluate('isnull(value)', { value: 0 })).toBe(false);
        expect(evaluate('isnull(value)', { value: '' })).toBe(false);
      });
    });

    describe('type conversion functions', () => {
      it('should evaluate tostring function', () => {
        expect(evaluate('tostring(42)', {})).toBe('42');
        expect(evaluate('tostring(value)', { value: true })).toBe('true');
      });

      it('should evaluate tonumber function', () => {
        expect(evaluate('tonumber("42")', {})).toBe(42);
        expect(evaluate('tonumber("3.14")', {})).toBe(3.14);
      });

      it('should evaluate toboolean function', () => {
        expect(evaluate('toboolean(1)', {})).toBe(true);
        expect(evaluate('toboolean(0)', {})).toBe(false);
        expect(evaluate('toboolean("")', {})).toBe(false);
        expect(evaluate('toboolean("yes")', {})).toBe(true);
      });
    });

    describe('array functions', () => {
      it('should evaluate sum function', () => {
        expect(evaluate('sum(prices)', { prices: [10, 20, 30] })).toBe(60);
        expect(evaluate('sum(prices)', { prices: [] })).toBe(0);
      });

      it('should evaluate avg function', () => {
        expect(evaluate('avg(scores)', { scores: [10, 20, 30] })).toBe(20);
        expect(evaluate('avg(scores)', { scores: [] })).toBe(0);
      });

      it('should evaluate count function', () => {
        expect(evaluate('count(items)', { items: [1, 2, 3, 4, 5] })).toBe(5);
        expect(evaluate('count(items)', { items: [] })).toBe(0);
      });

      it('should evaluate first function', () => {
        expect(evaluate('first(items)', { items: ['a', 'b', 'c'] })).toBe('a');
        expect(evaluate('first(items)', { items: [] })).toBeUndefined();
      });

      it('should evaluate last function', () => {
        expect(evaluate('last(items)', { items: ['a', 'b', 'c'] })).toBe('c');
        expect(evaluate('last(items)', { items: [] })).toBeUndefined();
      });

      it('should evaluate join function', () => {
        expect(evaluate('join(tags)', { tags: ['a', 'b', 'c'] })).toBe('a,b,c');
        expect(evaluate('join(tags, " | ")', { tags: ['a', 'b', 'c'] })).toBe(
          'a | b | c',
        );
      });

      it('should evaluate includes function', () => {
        expect(evaluate('includes(tags, "b")', { tags: ['a', 'b', 'c'] })).toBe(
          true,
        );
        expect(evaluate('includes(tags, "x")', { tags: ['a', 'b', 'c'] })).toBe(
          false,
        );
      });
    });

    describe('nested object paths', () => {
      it('should access nested object property', () => {
        const data = { user: { profile: { age: 25 } } };
        expect(evaluate('user.profile.age', data)).toBe(25);
      });

      it('should access deeply nested property', () => {
        const data = { a: { b: { c: { d: 42 } } } };
        expect(evaluate('a.b.c.d', data)).toBe(42);
      });

      it('should use nested property in formula', () => {
        const data = { stats: { damage: 100, multiplier: 1.5 } };
        expect(evaluate('stats.damage * stats.multiplier', data)).toBe(150);
      });
    });

    describe('array access', () => {
      it('should access array by index', () => {
        const data = { items: [{ price: 10 }, { price: 20 }, { price: 30 }] };
        expect(evaluate('items[0].price', data)).toBe(10);
        expect(evaluate('items[1].price', data)).toBe(20);
        expect(evaluate('items[2].price', data)).toBe(30);
      });

      it('should calculate with array elements', () => {
        const data = { items: [{ price: 10 }, { price: 20 }] };
        expect(evaluate('items[0].price + items[1].price', data)).toBe(30);
      });

      it('should access nested arrays', () => {
        const data = {
          matrix: [
            [1, 2],
            [3, 4],
          ],
        };
        expect(evaluate('matrix[0][0]', data)).toBe(1);
        expect(evaluate('matrix[1][1]', data)).toBe(4);
      });
    });
  });

  describe('dependency graph and topological order', () => {
    it('should build dependency graph from dependencies map', () => {
      const dependencies = {
        tax: ['price'],
        total: ['price', 'tax'],
      };

      const graph = buildDependencyGraph(dependencies);

      expect(graph.nodes.has('tax')).toBe(true);
      expect(graph.nodes.has('total')).toBe(true);
      expect(graph.nodes.has('price')).toBe(true);
      expect(graph.edges.get('tax')).toEqual(new Set(['price']));
      expect(graph.edges.get('total')).toEqual(new Set(['price', 'tax']));
    });

    it('should get topological order for simple chain', () => {
      const dependencies = {
        doubled: ['base'],
        tripled: ['doubled'],
      };

      const graph = buildDependencyGraph(dependencies);
      const result = getTopologicalOrder(graph);

      expect(result.success).toBe(true);
      expect(result.order.indexOf('base')).toBeLessThan(
        result.order.indexOf('doubled'),
      );
      expect(result.order.indexOf('doubled')).toBeLessThan(
        result.order.indexOf('tripled'),
      );
    });

    it('should get topological order for complex dependencies', () => {
      const dependencies = {
        basePrice: ['costPrice', 'markup'],
        discountAmount: ['basePrice', 'discountPercent'],
        priceBeforeTax: ['basePrice', 'discountAmount'],
        taxAmount: ['priceBeforeTax', 'taxRate'],
        finalPrice: ['priceBeforeTax', 'taxAmount'],
      };

      const graph = buildDependencyGraph(dependencies);
      const result = getTopologicalOrder(graph);

      expect(result.success).toBe(true);
      expect(result.order.indexOf('basePrice')).toBeLessThan(
        result.order.indexOf('discountAmount'),
      );
      expect(result.order.indexOf('discountAmount')).toBeLessThan(
        result.order.indexOf('priceBeforeTax'),
      );
      expect(result.order.indexOf('priceBeforeTax')).toBeLessThan(
        result.order.indexOf('finalPrice'),
      );
    });

    it('should detect circular dependency', () => {
      const dependencies = {
        a: ['b'],
        b: ['a'],
      };

      const graph = buildDependencyGraph(dependencies);
      const result = getTopologicalOrder(graph);

      expect(result.success).toBe(false);
      expect(result.error).toContain('Circular');
    });

    it('should detect longer circular dependency', () => {
      const dependencies = {
        a: ['b'],
        b: ['c'],
        c: ['a'],
      };

      const graph = buildDependencyGraph(dependencies);
      const result = getTopologicalOrder(graph);

      expect(result.success).toBe(false);
      expect(result.error).toContain('Circular');
    });

    it('should handle independent formulas', () => {
      const dependencies = {
        sumAB: ['a', 'b'],
        sumCD: ['c', 'd'],
      };

      const graph = buildDependencyGraph(dependencies);
      const result = getTopologicalOrder(graph);

      expect(result.success).toBe(true);
      expect(result.order).toContain('sumAB');
      expect(result.order).toContain('sumCD');
    });
  });

  describe('extractSchemaFormulas', () => {
    it('should extract formulas from schema', () => {
      const schema = createSchema({
        price: { type: 'number', default: 0 },
        quantity: { type: 'number', default: 1 },
        total: { type: 'number', default: 0, formula: 'price * quantity' },
      });

      const formulas = extractSchemaFormulas(schema);

      expect(formulas).toHaveLength(1);
      expect(formulas[0]).toMatchObject({
        fieldName: 'total',
        expression: 'price * quantity',
      });
    });

    it('should extract multiple formulas', () => {
      const schema = createSchema({
        price: { type: 'number', default: 0 },
        quantity: { type: 'number', default: 1 },
        taxRate: { type: 'number', default: 0.1 },
        subtotal: { type: 'number', default: 0, formula: 'price * quantity' },
        tax: { type: 'number', default: 0, formula: 'subtotal * taxRate' },
        total: { type: 'number', default: 0, formula: 'subtotal + tax' },
      });

      const formulas = extractSchemaFormulas(schema);

      expect(formulas).toHaveLength(3);
      const fieldNames = formulas.map((f) => f.fieldName);
      expect(fieldNames).toContain('subtotal');
      expect(fieldNames).toContain('tax');
      expect(fieldNames).toContain('total');
    });

    it('should return empty array for schema without formulas', () => {
      const schema = createSchema({
        name: { type: 'string', default: '' },
        price: { type: 'number', default: 0 },
      });

      const formulas = extractSchemaFormulas(schema);

      expect(formulas).toHaveLength(0);
    });

    it('should allow parsing dependencies from extracted formula', () => {
      const schema = createSchema({
        a: { type: 'number', default: 0 },
        b: { type: 'number', default: 0 },
        sum: { type: 'number', default: 0, formula: 'a + b' },
      });

      const formulas = extractSchemaFormulas(schema);
      const parsed = parseFormula(formulas[0]?.expression ?? '');

      expect(parsed.dependencies).toContain('a');
      expect(parsed.dependencies).toContain('b');
    });
  });

  describe('real-world formula scenarios', () => {
    describe('e-commerce product pricing', () => {
      it('should calculate complete pricing chain', () => {
        const data: Record<string, unknown> = {
          costPrice: 100,
          markup: 1.3,
          taxRate: 0.2,
          discountPercent: 10,
        };

        data['basePrice'] = evaluate('round(costPrice * markup, 2)', data);
        data['discountAmount'] = evaluate(
          'round(basePrice * discountPercent / 100, 2)',
          data,
        );
        data['priceBeforeTax'] = evaluate('basePrice - discountAmount', data);
        data['taxAmount'] = evaluate(
          'round(priceBeforeTax * taxRate, 2)',
          data,
        );
        data['finalPrice'] = evaluate('priceBeforeTax + taxAmount', data);
        data['margin'] = evaluate(
          'if(finalPrice > 0, round((finalPrice - costPrice) / finalPrice * 100, 1), 0)',
          data,
        );

        expect(data['basePrice']).toBe(130);
        expect(data['discountAmount']).toBe(13);
        expect(data['priceBeforeTax']).toBe(117);
        expect(data['taxAmount']).toBe(23.4);
        expect(data['finalPrice']).toBe(140.4);
        expect(data['margin']).toBeCloseTo(28.8, 1);
      });
    });

    describe('game item stats', () => {
      it('should calculate DPS and tier', () => {
        const data: Record<string, unknown> = {
          baseDamage: 100,
          attackSpeed: 1.0,
          critChance: 0.1,
          critMultiplier: 2.0,
        };

        data['dps'] = evaluate(
          'baseDamage * attackSpeed * (1 + critChance * critMultiplier)',
          data,
        );
        data['tier'] = evaluate(
          'if(dps >= 500, "S", if(dps >= 300, "A", if(dps >= 100, "B", "C")))',
          data,
        );

        expect(data['dps']).toBe(120);
        expect(data['tier']).toBe('B');
      });
    });

    describe('content with reading time', () => {
      it('should calculate word count and reading time', () => {
        const content =
          'Lorem ipsum dolor sit amet, consectetur adipiscing elit.';
        const data: Record<string, unknown> = {
          content,
          wordsPerMinute: 200,
        };

        data['wordCount'] = evaluate('length(trim(content)) / 5', data);
        data['readingTimeMinutes'] = evaluate(
          'ceil(wordCount / wordsPerMinute)',
          data,
        );
        data['readingTimeText'] = evaluate(
          'concat(tostring(readingTimeMinutes), " min read")',
          data,
        );

        expect(data['wordCount']).toBe(11.2);
        expect(data['readingTimeMinutes']).toBe(1);
        expect(data['readingTimeText']).toBe('1 min read');
      });
    });

    describe('grading system', () => {
      it('should calculate grade from score', () => {
        const testCases = [
          {
            score: 95,
            isPassing: true,
            expectedGrade: 'A',
            expectedStatus: 'Passed',
          },
          {
            score: 85,
            isPassing: true,
            expectedGrade: 'B',
            expectedStatus: 'Passed',
          },
          {
            score: 75,
            isPassing: true,
            expectedGrade: 'C',
            expectedStatus: 'Passed',
          },
          {
            score: 65,
            isPassing: true,
            expectedGrade: 'D',
            expectedStatus: 'Passed',
          },
          {
            score: 55,
            isPassing: true,
            expectedGrade: 'F',
            expectedStatus: 'Failed',
          },
          {
            score: 90,
            isPassing: false,
            expectedGrade: 'F',
            expectedStatus: 'Failed',
          },
        ];

        for (const {
          score,
          isPassing,
          expectedGrade,
          expectedStatus,
        } of testCases) {
          const data: Record<string, unknown> = { score, isPassing };

          data['grade'] = evaluate(
            'if(not(isPassing), "F", if(score >= 90, "A", if(score >= 80, "B", if(score >= 70, "C", if(score >= 60, "D", "F")))))',
            data,
          );
          data['status'] = evaluate(
            'if(isPassing && score >= 60, "Passed", "Failed")',
            data,
          );

          expect(data['grade']).toBe(expectedGrade);
          expect(data['status']).toBe(expectedStatus);
        }
      });
    });
  });

  describe('edge cases', () => {
    describe('numeric edge cases', () => {
      it('should handle very large numbers', () => {
        const result = evaluate('a * b', { a: 1e10, b: 1e10 });
        expect(result).toBe(1e20);
      });

      it('should handle very small numbers', () => {
        const result = evaluate('a + b', { a: 0.0000001, b: 0.0000002 });
        expect(result).toBeCloseTo(0.0000003);
      });

      it('should handle negative numbers', () => {
        const result = evaluate('a + b', { a: -10, b: -20 });
        expect(result).toBe(-30);
      });

      it('should handle zero', () => {
        expect(evaluate('a * 0', { a: 100 })).toBe(0);
        expect(evaluate('0 + a', { a: 100 })).toBe(100);
      });

      it('should handle Infinity', () => {
        expect(evaluate('a / 0', { a: 1 })).toBe(Infinity);
        expect(evaluate('a / 0', { a: -1 })).toBe(-Infinity);
      });
    });

    describe('string edge cases', () => {
      it('should handle empty string', () => {
        expect(evaluate('length(text)', { text: '' })).toBe(0);
        expect(evaluate('concat(text, "suffix")', { text: '' })).toBe('suffix');
      });

      it('should handle unicode characters', () => {
        expect(evaluate('length(text)', { text: '日本語' })).toBe(3);
        expect(evaluate('upper(text)', { text: 'café' })).toBe('CAFÉ');
      });

      it('should handle special characters', () => {
        const text = 'Hello\nWorld\t!';
        expect(evaluate('contains(text, "World")', { text })).toBe(true);
      });
    });

    describe('boolean edge cases', () => {
      it('should handle truthy/falsy values', () => {
        expect(evaluate('toboolean(value)', { value: 0 })).toBe(false);
        expect(evaluate('toboolean(value)', { value: 1 })).toBe(true);
        expect(evaluate('toboolean(value)', { value: '' })).toBe(false);
        expect(evaluate('toboolean(value)', { value: 'text' })).toBe(true);
      });
    });

    describe('array edge cases', () => {
      it('should handle empty array', () => {
        expect(evaluate('sum(arr)', { arr: [] })).toBe(0);
        expect(evaluate('avg(arr)', { arr: [] })).toBe(0);
        expect(evaluate('count(arr)', { arr: [] })).toBe(0);
        expect(evaluate('first(arr)', { arr: [] })).toBeUndefined();
        expect(evaluate('last(arr)', { arr: [] })).toBeUndefined();
      });

      it('should handle single element array', () => {
        expect(evaluate('sum(arr)', { arr: [42] })).toBe(42);
        expect(evaluate('avg(arr)', { arr: [42] })).toBe(42);
        expect(evaluate('first(arr)', { arr: [42] })).toBe(42);
        expect(evaluate('last(arr)', { arr: [42] })).toBe(42);
      });

      it('should handle array with null elements', () => {
        expect(evaluate('count(arr)', { arr: [1, null, 3] })).toBe(3);
      });
    });

    describe('null and undefined handling', () => {
      it('should detect null with isnull', () => {
        expect(evaluate('isnull(value)', { value: null })).toBe(true);
        expect(evaluate('isnull(value)', { value: undefined })).toBe(true);
        expect(evaluate('isnull(value)', { value: 0 })).toBe(false);
      });

      it('should use coalesce for fallback', () => {
        expect(evaluate('coalesce(a, b, 0)', { a: null, b: null })).toBe(0);
        expect(evaluate('coalesce(a, b, 0)', { a: null, b: 5 })).toBe(5);
        expect(evaluate('coalesce(a, b, 0)', { a: 10, b: 5 })).toBe(10);
      });
    });

    describe('type coercion', () => {
      it('should coerce string to number in arithmetic', () => {
        expect(evaluate('value * 2', { value: '5' })).toBe(10);
      });

      it('should coerce number to string in concat', () => {
        expect(evaluate('concat("Price: ", price)', { price: 100 })).toBe(
          'Price: 100',
        );
      });

      it('should coerce in comparison', () => {
        expect(evaluate('value > 5', { value: '10' })).toBe(true);
      });
    });
  });
});
