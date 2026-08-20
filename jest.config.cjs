/** @type {import('ts-jest').JestConfigWithTsJest} */
module.exports = {
  testEnvironment: 'jsdom',
  transform: {
    '^.+\\.tsx?$': ['ts-jest', {
      tsconfig: 'tsconfig.json',
      jsx: 'react-jsx',
    }],
  },
  moduleNameMapper: {
    '\\.(css|less|scss|sass)$': '<rootDir>/src/test/__mocks__/styleMock.js',
  },
  setupFiles: ['<rootDir>/src/test/setup.ts'],
  setupFilesAfterFramework: ['<rootDir>/src/test/setupAfterFramework.ts'],
  testMatch: ['<rootDir>/src/**/*.test.{ts,tsx}'],
}
