export const tableByIdManifest = {
  // === READONLY DATA ===
  // Used by Read Operations and Error Cases (non-destructive tests)

  owner: {
    userId: 'UHMKke7sDyDZhrOQRhKy_',
    username: 'owner-UHMKke7sDyDZhrOQRhKy_',
    organizationId: 'WRRFGIJi_U0Wbv639wM-y',
  },
  project: {
    projectId: 'rWM6-8f56bquZ-3usXaKq',
    projectName: 'project-rWM6-8f56bquZ-3usXaKq',
    branchId: 'Gp_nyOcSh2LftadgBxdwo',
    branchName: 'master',
    headRevisionId: 'E6WrA7L_B93MNN42dIg3Q',
    draftRevisionId: 'n8aMmbBqYplfL7O7WLc8P',
  },
  table: {
    tableId: 'wrO0aSYi2w9JtHjbrQ5n3',
    headVersionId: '2tK3oDiyOyreh8F8J8zuC',
    draftVersionId: 'Zoygu_fpkyfTF_hSloUgk',
    schemaRowVersionId: '2M4XhEuTAgQsWJZqGrxxZ',
  },
  row: {
    rowId: 'FRN14lFK_lhz10BX4xNsC',
    headVersionId: 'lXlpO_5Vo6xqf_RB6zOLk',
    draftVersionId: 'dwli2JJoW6yp75T7xlHRt',
  },

  writeTests: {
    updateRow: {
      rowId: 'XkMp9qR7sT3uV8wY2zA4b',
      headVersionId: 'cD5eF6gH7iJ8kL9mN0oP1',
      draftVersionId: 'qR2sT3uV4wX5yZ6aB7cD8',
    },
    deleteRow: {
      rowId: 'eF9gH0iJ1kL2mN3oP4qR5',
      headVersionId: 'sT6uV7wX8yZ9aB0cD1eF2',
      draftVersionId: 'gH3iJ4kL5mN6oP7qR8sT9',
    },
  },

  anotherOwner: {
    userId: 'vu6r5-6mh-8ls2gtlR4X4',
    username: 'another-vu6r5-6mh-8ls2gtlR4X4',
    organizationId: '1s3NYPiHnGEHGF8cin_Kp',
  },
  anotherProject: {
    projectId: 'e9nTwNSDwStWUnFsNcNK8',
    projectName: 'project-e9nTwNSDwStWUnFsNcNK8',
    branchId: 'KhszW1gezdlW-NeLvOPrm',
    branchName: 'master',
    headRevisionId: 'DUkYPC-rnytE3Uh1ArHTp',
    draftRevisionId: 'jollGC7SQjUst4nlp8CXE',
  },

  // Public project for public access tests
  publicProject: {
    projectId: 'BBJDQzfTCoYMZtu0REOSC',
    projectName: 'public-BBJDQzfTCoYMZtu0REOSC',
    branchId: 'yCk8mP3qR7vNfWxL2sT1u',
    branchName: 'master',
    headRevisionId: 'aB9cD4eF5gH6iJ7kL8mN0',
    draftRevisionId: 'pQ1rS2tU3vW4xY5zA6bC7',
  },
  publicTable: {
    tableId: 'dE8fG9hI0jK1lM2nO3pQ4',
    headVersionId: 'rS5tU6vW7xY8zA9bC0dE1',
    draftVersionId: 'fG2hI3jK4lM5nO6pQ7rS8',
    schemaRowVersionId: 'tU9vW0xY1zA2bC3dE4fG5',
  },
  publicRow: {
    rowId: 'hI6jK7lM8nO9pQ0rS1tU2',
    headVersionId: 'vW3xY4zA5bC6dE7fG8hI9',
    draftVersionId: 'jK0lM1nO2pQ3rS4tU5vW6',
  },

  // === WRITE TEST DATA ===
  // Each write test group has its own independent project/table/row

  // For create rows tests
  writeCreateRows: {
    projectId: 'P1IBkdV7xEZlGVe8CHSTD',
    projectName: 'write-create-rows-P1IBkdV7xEZlGVe8CHSTD',
    branchId: 'EL8AuBS-iYv6dXV_h7nOT',
    branchName: 'master',
    headRevisionId: 'QZNj6GXGDgrg5sITsPE9O',
    draftRevisionId: '2fh7DsyGgpwRE3fQ0GT8a',
    tableId: 'Ir9PUw13LoYKVMdb9TDSJ',
    tableHeadVersionId: 'apEpPpGnyfHKVU9dKkhXU',
    tableDraftVersionId: 'VYZV74V2uO-JK0DHwKwVC',
    schemaRowVersionId: '1NdwbFXm03KCx4N5vKHhQ',
    rowId: 'gkCFd93zbXmj3IZH8lcZ7',
    rowHeadVersionId: 'c-vr5grVmT_mB6ucajIP2',
    rowDraftVersionId: 'UBmpglIY_izLFmjNXk_hB',
  },

  // For delete table test
  writeDeleteTable: {
    projectId: 'cGFDFy7Rm0swzcrYQMWU5',
    projectName: 'write-delete-table-cGFDFy7Rm0swzcrYQMWU5',
    branchId: 'AAIUklOzQsGLwpwNFlA3O',
    branchName: 'master',
    headRevisionId: 'rK-oGa5s1A8a8uT7Qy5bY',
    draftRevisionId: 'Bg7MWbyznSfdNViuXlzE1',
    tableId: 'uQM_TxjEYEYQFjf6JLJmZ',
    tableHeadVersionId: 'S1doOQCIXGSBeoSaWd9SN',
    tableDraftVersionId: 'J4Obq1lWtVVLX-zBhqYFS',
    schemaRowVersionId: 'AeA0WjtvEgKaaicslfxX7',
  },

  // For update table test
  writeUpdateTable: {
    projectId: 'gvTjspeUtrqyq_dwsgcIC',
    projectName: 'write-update-table-gvTjspeUtrqyq_dwsgcIC',
    branchId: 'D9wXMR3bxq3yyjy_5YBi1',
    branchName: 'master',
    headRevisionId: 'E-u1LVafQ6jo75IYCDnQr',
    draftRevisionId: '0IrNgXtPLYu0fidXPywDw',
    tableId: 'CNS7l4T-y3ygd5S9wYleX',
    tableHeadVersionId: '5guLR4nw2KStOJXPwc2Dd',
    tableDraftVersionId: 'Ug_TZTSDCAo6FMBq6c5oo',
    schemaRowVersionId: 'xgwFGjfWK3e5anvqgLIYE',
    rowId: 'dQEmMeAj-Z_FBFw6sq327',
    rowHeadVersionId: '1ns_ioMEOIVwtlqW9UDwo',
    rowDraftVersionId: 'E_EvB-84-ebLdiW-FdCGc',
  },

  // For rename table test
  writeRenameTable: {
    projectId: 'nBvhRJyafe-crIgK5KIaY',
    projectName: 'write-rename-table-nBvhRJyafe-crIgK5KIaY',
    branchId: 'l6UQJSqvle6_HNZK6Kaua',
    branchName: 'master',
    headRevisionId: 'nPZ9gwvHnZl8DQet_JNq3',
    draftRevisionId: '-sm02t97UULO9qi95xrKv',
    tableId: 'uISOgDAQwYTvkjtWptj0r',
    tableHeadVersionId: 'Hz1PwoVYzRcAl9LB2mjrN',
    tableDraftVersionId: 'lFuc-LRo8S78QQQWmAiR6',
    schemaRowVersionId: 'SgPCfmTvve_pNGiEeanWL',
  },

  // For delete rows test
  writeDeleteRows: {
    projectId: '2wQqWimv83V3MtxzYUMTu',
    projectName: 'write-delete-rows-2wQqWimv83V3MtxzYUMTu',
    branchId: 'l9HcqPiV3GhQDjZrXtRKt',
    branchName: 'master',
    headRevisionId: 'xR2sT3uV4wX5yZ6aB7cD8',
    draftRevisionId: 'eF9gH0iJ1kL2mN3oP4qR5',
    tableId: 'sT6uV7wX8yZ9aB0cD1eF2',
    tableHeadVersionId: 'gH3iJ4kL5mN6oP7qR8sT9',
    tableDraftVersionId: 'uV0wX1yZ2aB3cD4eF5gH6',
    schemaRowVersionId: 'iJ7kL8mN9oP0qR1sT2uV3',
    rowId: 'wX4yZ5aB6cD7eF8gH9iJ0',
    rowHeadVersionId: 'kL1mN2oP3qR4sT5uV6wX7',
    rowDraftVersionId: 'yZ8aB9cD0eF1gH2iJ3kL4',
  },

  // For update rows test
  writeUpdateRows: {
    projectId: 'mN5oP6qR7sT8uV9wX0yZ1',
    projectName: 'write-update-rows-mN5oP6qR7sT8uV9wX0yZ1',
    branchId: 'aB2cD3eF4gH5iJ6kL7mN8',
    branchName: 'master',
    headRevisionId: 'oP9qR0sT1uV2wX3yZ4aB5',
    draftRevisionId: 'cD6eF7gH8iJ9kL0mN1oP2',
    tableId: 'qR3sT4uV5wX6yZ7aB8cD9',
    tableHeadVersionId: 'eF0gH1iJ2kL3mN4oP5qR6',
    tableDraftVersionId: 'sT7uV8wX9yZ0aB1cD2eF3',
    schemaRowVersionId: 'gH4iJ5kL6mN7oP8qR9sT0',
    rowId: 'uV1wX2yZ3aB4cD5eF6gH7',
    rowHeadVersionId: 'iJ8kL9mN0oP1qR2sT3uV4',
    rowDraftVersionId: 'wX5yZ6aB7cD8eF9gH0iJ1',
  },

  // For patch rows test
  writePatchRows: {
    projectId: 'kL2mN3oP4qR5sT6uV7wX8',
    projectName: 'write-patch-rows-kL2mN3oP4qR5sT6uV7wX8',
    branchId: 'yZ9aB0cD1eF2gH3iJ4kL5',
    branchName: 'master',
    headRevisionId: 'mN6oP7qR8sT9uV0wX1yZ2',
    draftRevisionId: 'aB3cD4eF5gH6iJ7kL8mN9',
    tableId: 'oP0qR1sT2uV3wX4yZ5aB6',
    tableHeadVersionId: 'cD7eF8gH9iJ0kL1mN2oP3',
    tableDraftVersionId: 'qR4sT5uV6wX7yZ8aB9cD0',
    schemaRowVersionId: 'eF1gH2iJ3kL4mN5oP6qR7',
    rowId: 'sT8uV9wX0yZ1aB2cD3eF4',
    rowHeadVersionId: 'gH5iJ6kL7mN8oP9qR0sT1',
    rowDraftVersionId: 'uV2wX3yZ4aB5cD6eF7gH8',
  },

  systemTables: {
    schemaVersionId: 'dE9fG0hI1jK2lM3nO4pQ5',
    migrationVersionId: 'rS6tU7vW8xY9zA0bC1dE2',
    publicSchemaVersionId: 'fG3hI4jK5lM6nO7pQ8rS9',
    publicMigrationVersionId: 'tU0vW1xY2zA3bC4dE5fG6',
    anotherSchemaVersionId: 'hI7jK8lM9nO0pQ1rS2tU3',
    anotherMigrationVersionId: 'vW4xY5zA6bC7dE8fG9hI0',
    // Write tests system tables
    writeCreateRowsSchemaVersionId: 'wCr1SchemaVersion00001',
    writeCreateRowsMigrationVersionId: 'wCr1MigrationVersion01',
    writeDeleteTableSchemaVersionId: 'wDt1SchemaVersion00001',
    writeDeleteTableMigrationVersionId: 'wDt1MigrationVersion01',
    writeUpdateTableSchemaVersionId: 'wUt1SchemaVersion00001',
    writeUpdateTableMigrationVersionId: 'wUt1MigrationVersion01',
    writeRenameTableSchemaVersionId: 'wRt1SchemaVersion00001',
    writeRenameTableMigrationVersionId: 'wRt1MigrationVersion01',
    writeDeleteRowsSchemaVersionId: 'wDr1SchemaVersion00001',
    writeDeleteRowsMigrationVersionId: 'wDr1MigrationVersion01',
    writeUpdateRowsSchemaVersionId: 'wUr1SchemaVersion00001',
    writeUpdateRowsMigrationVersionId: 'wUr1MigrationVersion01',
    writePatchRowsSchemaVersionId: 'wPr1SchemaVersion00001',
    writePatchRowsMigrationVersionId: 'wPr1MigrationVersion01',
  },
} as const;

export type TableByIdManifest = typeof tableByIdManifest;
