import assert from 'node:assert/strict';
import test from 'node:test';
import { sanitizeAnalyticsProperties } from '../src/utils/analyticsPrivacy';

test('analytics preserva somente propriedades operacionais permitidas', () => {
  assert.deepEqual(sanitizeAnalyticsProperties({
    jobId: 'job-1',
    areaId: 'technology_data',
    workMode: 'remote',
    rating: 5,
    hasCv: true,
  }), {
    jobId: 'job-1',
    areaId: 'technology_data',
    workMode: 'remote',
    rating: 5,
    hasCv: true,
  });
});

test('analytics descarta PII, conteudo de CV e prompts', () => {
  assert.deepEqual(sanitizeAnalyticsProperties({
    email: 'candidate@example.com',
    name: 'Candidate Name',
    phone: '11999999999',
    cv: 'full resume',
    prompt: 'raw prompt',
    message: 'AI response',
    content: 'sensitive text',
  }), {});
});

test('analytics descarta numeros invalidos e limita strings permitidas', () => {
  const result = sanitizeAnalyticsProperties({
    durationMs: Number.NaN,
    resultCount: Number.POSITIVE_INFINITY,
    reason: 'x'.repeat(160),
  });
  assert.equal(result.durationMs, undefined);
  assert.equal(result.resultCount, undefined);
  assert.equal(String(result.reason).length, 120);
});

test('analytics do Apply aceita apenas medidas e categorias sem conteúdo profissional', () => {
  assert.deepEqual(sanitizeAnalyticsProperties({
    analyticsSchemaVersion: 1,
    answerCategory: 'salary_expectation',
    packageRevision: 3,
    reusedAnswerCount: 2,
    question: 'Qual é sua pretensão?',
    answer: 'R$ 5.000',
    resumeText: 'conteúdo do currículo',
    userId: 'identificador-direto',
  }), {
    analyticsSchemaVersion: 1,
    answerCategory: 'salary_expectation',
    packageRevision: 3,
    reusedAnswerCount: 2,
  });
});

test('analytics registra a decisao de consentimento sem conteudo do curriculo', () => {
  assert.deepEqual(sanitizeAnalyticsProperties({
    granted: true,
    consentVersion: '2026-08-03',
    provider: 'Anthropic',
    documentBase64: 'conteudo sensivel',
  }), {
    granted: true,
    consentVersion: '2026-08-03',
  });
});
