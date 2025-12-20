import {
  DataValidationException,
  ForeignKeyRowsNotFoundException,
  ForeignKeyTableNotFoundException,
  ValidationErrorCode,
} from '../validation.exception';

describe('DataValidationException', () => {
  describe('formatMessage', () => {
    it('formats message with no details and no context', () => {
      const exception = new DataValidationException([]);
      const response = exception.getResponse() as { message: string };

      expect(response.message).toBe('Data validation failed');
    });

    it('formats message with no details but with context (tableId only)', () => {
      const exception = new DataValidationException([], { tableId: 'users' });
      const response = exception.getResponse() as { message: string };

      expect(response.message).toBe('Data validation failed in table "users"');
    });

    it('formats message with no details but with full context', () => {
      const exception = new DataValidationException([], {
        tableId: 'users',
        rowId: 'user-1',
      });
      const response = exception.getResponse() as { message: string };

      expect(response.message).toBe(
        'Data validation failed in table "users" for row "user-1"',
      );
    });

    it('formats message with single detail and no context', () => {
      const exception = new DataValidationException([
        { path: '/name', message: 'must be string' },
      ]);
      const response = exception.getResponse() as { message: string };

      expect(response.message).toBe(
        'Validation error at "/name": must be string',
      );
    });

    it('formats message with single detail and full context', () => {
      const exception = new DataValidationException(
        [{ path: '/age', message: 'must be number' }],
        { tableId: 'users', rowId: 'user-1' },
      );
      const response = exception.getResponse() as { message: string };

      expect(response.message).toBe(
        'Validation error at "/age" in table "users" for row "user-1": must be number',
      );
    });

    it('formats message with multiple details', () => {
      const exception = new DataValidationException([
        { path: '/name', message: 'must be string' },
        { path: '/age', message: 'must be number' },
      ]);
      const response = exception.getResponse() as { message: string };

      expect(response.message).toBe('Validation failed with 2 errors');
    });

    it('formats message with multiple details and context', () => {
      const exception = new DataValidationException(
        [
          { path: '/name', message: 'must be string' },
          { path: '/age', message: 'must be number' },
        ],
        { tableId: 'users' },
      );
      const response = exception.getResponse() as { message: string };

      expect(response.message).toBe(
        'Validation failed with 2 errors in table "users"',
      );
    });
  });

  it('returns correct error code', () => {
    const exception = new DataValidationException([]);
    const response = exception.getResponse() as { code: string };

    expect(response.code).toBe(ValidationErrorCode.INVALID_DATA);
  });

  it('getDetails returns details', () => {
    const details = [{ path: '/name', message: 'required' }];
    const exception = new DataValidationException(details);

    expect(exception.getDetails()).toEqual(details);
  });

  it('getContext returns context', () => {
    const context = { tableId: 'users', rowId: 'user-1' };
    const exception = new DataValidationException([], context);

    expect(exception.getContext()).toEqual(context);
  });
});

describe('ForeignKeyTableNotFoundException', () => {
  it('formats message without context and path', () => {
    const exception = new ForeignKeyTableNotFoundException('categories');
    const response = exception.getResponse() as { message: string };

    expect(response.message).toBe(
      'Referenced table "categories" does not exist in the revision',
    );
  });

  it('formats message with path but no context', () => {
    const exception = new ForeignKeyTableNotFoundException(
      'categories',
      undefined,
      '/categoryId',
    );
    const response = exception.getResponse() as { message: string };

    expect(response.message).toBe(
      'Referenced table "categories" at path "/categoryId" does not exist in the revision',
    );
  });

  it('formats message with context (tableId only)', () => {
    const exception = new ForeignKeyTableNotFoundException('categories', {
      tableId: 'products',
    });
    const response = exception.getResponse() as { message: string };

    expect(response.message).toBe(
      'Referenced table "categories" does not exist in the revision (in table "products")',
    );
  });

  it('formats message with full context', () => {
    const exception = new ForeignKeyTableNotFoundException(
      'categories',
      { tableId: 'products', rowId: 'prod-1' },
      '/categoryId',
    );
    const response = exception.getResponse() as { message: string };

    expect(response.message).toBe(
      'Referenced table "categories" at path "/categoryId" does not exist in the revision (in table "products", row "prod-1")',
    );
  });

  it('returns correct error code', () => {
    const exception = new ForeignKeyTableNotFoundException('categories');
    const response = exception.getResponse() as { code: string };

    expect(response.code).toBe(ValidationErrorCode.TABLE_NOT_FOUND);
  });
});

describe('ForeignKeyRowsNotFoundException', () => {
  describe('formatMessage', () => {
    it('formats message with no details', () => {
      const exception = new ForeignKeyRowsNotFoundException([]);
      const response = exception.getResponse() as { message: string };

      expect(response.message).toBe('Foreign key validation failed');
    });

    it('formats message with no details but with context', () => {
      const exception = new ForeignKeyRowsNotFoundException([], {
        tableId: 'orders',
        rowId: 'order-1',
      });
      const response = exception.getResponse() as { message: string };

      expect(response.message).toBe(
        'Foreign key validation failed in table "orders" for row "order-1"',
      );
    });

    it('formats message with single detail and single missing row', () => {
      const exception = new ForeignKeyRowsNotFoundException([
        { path: '/userId', tableId: 'users', missingRowIds: ['user-1'] },
      ]);
      const response = exception.getResponse() as { message: string };

      expect(response.message).toBe(
        'Foreign key error at "/userId": "user-1" not found in table "users"',
      );
    });

    it('formats message with single detail and two missing rows', () => {
      const exception = new ForeignKeyRowsNotFoundException([
        {
          path: '/userId',
          tableId: 'users',
          missingRowIds: ['user-1', 'user-2'],
        },
      ]);
      const response = exception.getResponse() as { message: string };

      expect(response.message).toBe(
        'Foreign key error at "/userId": 2 rows ("user-1", "user-2") not found in table "users"',
      );
    });

    it('formats message with single detail and three missing rows', () => {
      const exception = new ForeignKeyRowsNotFoundException([
        {
          path: '/userId',
          tableId: 'users',
          missingRowIds: ['user-1', 'user-2', 'user-3'],
        },
      ]);
      const response = exception.getResponse() as { message: string };

      expect(response.message).toBe(
        'Foreign key error at "/userId": 3 rows ("user-1", "user-2", "user-3") not found in table "users"',
      );
    });

    it('formats message with single detail and more than three missing rows (truncated)', () => {
      const exception = new ForeignKeyRowsNotFoundException([
        {
          path: '/userId',
          tableId: 'users',
          missingRowIds: ['user-1', 'user-2', 'user-3', 'user-4', 'user-5'],
        },
      ]);
      const response = exception.getResponse() as { message: string };

      expect(response.message).toBe(
        'Foreign key error at "/userId": 5 rows ("user-1", "user-2", "user-3"...) not found in table "users"',
      );
    });

    it('formats message with single detail and context', () => {
      const exception = new ForeignKeyRowsNotFoundException(
        [{ path: '/userId', tableId: 'users', missingRowIds: ['user-1'] }],
        { tableId: 'orders' },
      );
      const response = exception.getResponse() as { message: string };

      expect(response.message).toBe(
        'Foreign key error at "/userId" in table "orders": "user-1" not found in table "users"',
      );
    });

    it('formats message with multiple details', () => {
      const exception = new ForeignKeyRowsNotFoundException([
        { path: '/userId', tableId: 'users', missingRowIds: ['user-1'] },
        {
          path: '/categoryId',
          tableId: 'categories',
          missingRowIds: ['cat-1'],
        },
      ]);
      const response = exception.getResponse() as { message: string };

      expect(response.message).toBe(
        'Foreign key validation failed: 2 references not found',
      );
    });

    it('formats message with multiple details and context', () => {
      const exception = new ForeignKeyRowsNotFoundException(
        [
          { path: '/userId', tableId: 'users', missingRowIds: ['user-1'] },
          {
            path: '/categoryId',
            tableId: 'categories',
            missingRowIds: ['cat-1'],
          },
        ],
        { tableId: 'orders', rowId: 'order-1' },
      );
      const response = exception.getResponse() as { message: string };

      expect(response.message).toBe(
        'Foreign key validation failed: 2 references not found in table "orders" for row "order-1"',
      );
    });
  });

  it('returns correct error code', () => {
    const exception = new ForeignKeyRowsNotFoundException([]);
    const response = exception.getResponse() as { code: string };

    expect(response.code).toBe(ValidationErrorCode.FOREIGN_KEY_NOT_FOUND);
  });

  it('getDetails returns details', () => {
    const details = [
      { path: '/userId', tableId: 'users', missingRowIds: ['user-1'] },
    ];
    const exception = new ForeignKeyRowsNotFoundException(details);

    expect(exception.getDetails()).toEqual(details);
  });

  it('getContext returns context', () => {
    const context = { tableId: 'orders', rowId: 'order-1' };
    const exception = new ForeignKeyRowsNotFoundException([], context);

    expect(exception.getContext()).toEqual(context);
  });
});
