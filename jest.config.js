module.exports = {
  preset: 'jest-expo',
  testMatch: ['<rootDir>/tests/jest/**/*.test.[jt]s?(x)'],
  setupFilesAfterEnv: ['<rootDir>/tests/jest/setup.ts'],
  clearMocks: true,
  collectCoverageFrom: [
    'src/**/*.{ts,tsx}',
    '!src/**/*.d.ts',
  ],
};
