// jest.config.js
module.exports = {
  verbose: true,
  transform: {
    "^.+\\.tsx?$": require.resolve('ts-jest')
  },
  testPathIgnorePatterns: [
    "/build/",
    "/node_modules/",
  ],
  testRegex: '/__tests__/.*\\.test\\.ts$',
  moduleFileExtensions: [
    'ts',
    'tsx',
    'js',
    'jsx',
    'json',
    'node'
  ],
  testEnvironment: 'node'
}
