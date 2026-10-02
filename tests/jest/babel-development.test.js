const { execFileSync } = require('node:child_process');
const path = require('node:path');

test('Expo development transform resolves its peer dependencies on all platforms', () => {
  const script = `
    const babel = require('@babel/core');
    for (const platform of ['web', 'ios', 'android']) {
      const output = babel.transformSync('export const x: number = 1;', {
        filename: 'src/__babel_smoke__.tsx',
        envName: 'development',
        caller: { name: 'metro', platform, isDev: true, supportsStaticESM: true },
      });
      if (!output.code) throw new Error('DEVELOPMENT_TRANSFORM_FAILED');
    }
  `;
  expect(() => execFileSync(process.execPath, ['-e', script], {
    cwd: path.resolve(__dirname, '../..'),
    stdio: 'pipe',
  })).not.toThrow();
});
