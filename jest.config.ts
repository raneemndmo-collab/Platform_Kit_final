import type { Config } from 'jest';

const config: Config = {
  moduleFileExtensions: ['js', 'json', 'ts'],
  rootDir: '.',
  testRegex: '.*\\.spec\\.ts$',
  transform: { '^.+\\.(t|j)s$': 'ts-jest' },
  collectCoverageFrom: [
    'kernel/**/*.ts',
    'shared/**/*.ts',
    '!**/*.module.ts',
    '!**/index.ts',
    '!**/main.ts',
  ],
  coverageDirectory: './coverage',
  coverageThreshold: {
    global: { branches: 70, functions: 80, lines: 90, statements: 90 },
  },
  testEnvironment: 'node',
  moduleNameMapper: {
    '^@kernel/(.*)$': '<rootDir>/kernel/$1',
    '^@shared/(.*)$': '<rootDir>/shared/$1',
    '^@config/(.*)$': '<rootDir>/config/$1',
  },
};

export default config;
