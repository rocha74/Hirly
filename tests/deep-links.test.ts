import assert from 'node:assert/strict';
import { describe, test } from 'node:test';
import {
  buildJobCustomScheme,
  buildJobUrl,
  normalizeInitialNavigationUrl,
  parseDeepLink,
} from '../src/utils/deepLinks';
import { decideDeepLinkGate, parsePendingJobLink } from '../src/utils/deepLinkRouting';

describe('deep link parser', () => {
  test('aceita scheme e os dois hosts HTTPS oficiais', () => {
    const expected = { type: 'job', jobId: 'job_ABC-123' } as const;
    assert.deepEqual(parseDeepLink('hirly://v/job_ABC-123'), expected);
    assert.deepEqual(parseDeepLink('hirly-dev://v/job_ABC-123'), expected);
    assert.deepEqual(parseDeepLink('hirly-staging://v/job_ABC-123'), expected);
    assert.deepEqual(parseDeepLink('https://hirly.app/v/job_ABC-123'), expected);
    assert.deepEqual(parseDeepLink('https://www.hirly.app/v/job_ABC-123'), expected);
  });

  test('rejeita HTTP, host externo, credenciais, rota extra e ID inseguro', () => {
    const invalid = { type: 'invalid' };
    assert.deepEqual(parseDeepLink('http://hirly.app/v/job-1'), invalid);
    assert.deepEqual(parseDeepLink('https://example.com/v/job-1'), invalid);
    assert.deepEqual(parseDeepLink('https://user:pass@hirly.app/v/job-1'), invalid);
    assert.deepEqual(parseDeepLink('https://hirly.app/v/job-1/extra'), invalid);
    assert.deepEqual(parseDeepLink('hirly://v/..%2Fsecret'), invalid);
    assert.deepEqual(parseDeepLink('not-a-url'), invalid);
  });

  test('gera somente URLs a partir de IDs validos', () => {
    assert.equal(buildJobUrl('job-1'), 'https://hirly.app/v/job-1');
    assert.equal(buildJobCustomScheme('job-1'), 'hirly://v/job-1');
    assert.throws(() => buildJobUrl('../job'));
  });

  test('diferencia a raiz web de um destino de deep link', () => {
    assert.equal(normalizeInitialNavigationUrl('https://hirly.app/'), null);
    assert.equal(normalizeInitialNavigationUrl('http://localhost:8081/'), null);
    assert.equal(
      normalizeInitialNavigationUrl('https://hirly.app/v/job-1'),
      'https://hirly.app/v/job-1',
    );
    assert.equal(
      normalizeInitialNavigationUrl('hirly://v/job-1'),
      'hirly://v/job-1',
    );
  });
});

describe('deep link routing gate', () => {
  const job = { type: 'job', jobId: 'job-1' } as const;

  test('direciona link invalido para erro amigavel', () => {
    assert.equal(decideDeepLinkGate({ type: 'invalid' }, true, true), 'invalid');
  });

  test('preserva destino durante login e onboarding', () => {
    assert.equal(decideDeepLinkGate(job, false, false), 'auth');
    assert.equal(decideDeepLinkGate(job, true, false), 'onboarding');
  });

  test('resolve a vaga somente com sessao e onboarding completos', () => {
    assert.equal(decideDeepLinkGate(job, true, true), 'resolve');
  });

  test('retoma somente destino recente e bem formado', () => {
    const now = Date.UTC(2026, 6, 11);
    assert.equal(parsePendingJobLink(JSON.stringify({ jobId: 'job-1', savedAt: now - 1000 }), now), 'job-1');
    assert.equal(parsePendingJobLink(JSON.stringify({ jobId: 'job-1', savedAt: now - 86_400_001 }), now), null);
    assert.equal(parsePendingJobLink(JSON.stringify({ jobId: '../job', savedAt: now }), now), null);
    assert.equal(parsePendingJobLink('{invalid', now), null);
  });
});
