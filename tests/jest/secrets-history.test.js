const { execFileSync, spawnSync } = require('node:child_process');
const fs = require('node:fs');
const os = require('node:os');
const path = require('node:path');

test('history scanner inspects a detached PR commit without printing the token', () => {
  const directory = fs.mkdtempSync(path.join(os.tmpdir(), 'hirly-scanner-test-'));
  const git = (...args) => execFileSync('git', args, { cwd: directory, stdio: 'pipe' });
  git('init');
  git('config', 'user.name', 'Hirly test');
  git('config', 'user.email', 'test@example.invalid');
  fs.writeFileSync(path.join(directory, 'example.txt'), 'safe baseline');
  git('add', 'example.txt');
  git('commit', '-m', 'baseline');
  git('checkout', '--detach');
  const fixtureToken = ['sk', 'ant', 'testtokenonly1234567890'].join('-');
  fs.writeFileSync(path.join(directory, 'example.txt'), fixtureToken);
  git('add', 'example.txt');
  git('commit', '-m', 'detached fixture');
  const result = spawnSync(process.execPath, [
    path.resolve(__dirname, '../../scripts/secrets-check.js'), '--history',
  ], { cwd: directory, encoding: 'utf8' });

  expect(result.status).toBe(1);
  expect(result.stderr).toContain('provider-secret-token');
  expect(result.stderr).not.toContain(fixtureToken);
});
