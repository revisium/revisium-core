import type { Config } from 'jest';

const config: Config = {
  testEnvironment: 'node',

  modulePaths: ['<rootDir>'],
  moduleFileExtensions: ['ts', 'js', 'json'],
  moduleNameMapper: {
    '^src/(.*)$': '<rootDir>/src/$1',
    '^bentocache$':
      '<rootDir>/src/infrastructure/cache/__mocks__/bentocache.js',
    '^bentocache/drivers/memory$':
      '<rootDir>/src/infrastructure/cache/__mocks__/bentocache-memory.js',
    '^bentocache/drivers/redis$':
      '<rootDir>/src/infrastructure/cache/__mocks__/bentocache-redis.js',
  },

  testRegex: '.*\\.spec\\.ts$',

  transform: {
    '^.+\\.(t|j)s$': [
      'ts-jest',
      {
        isolatedModules: true,
      },
    ],
  },

  setupFiles: ['<rootDir>/jest.setup.ts'],

  collectCoverageFrom: [
    '<rootDir>/src/**/*.(t|j)s',
    '!<rootDir>/src/main.ts',
    '!<rootDir>/src/__generated__/**',
    '!<rootDir>/src/**/__tests__/**',
    '!<rootDir>/src/**/index.ts',
    '!<rootDir>/src/**/*.module.ts',
    '!<rootDir>/src/infrastructure/cache',
    '!<rootDir>/jest.config.ts',
  ],

  coverageReporters: ['text-summary', 'lcov'],
};

export default config;
