import assert from 'node:assert/strict';
import { describe, test } from 'node:test';
import type { MatchableJob, MatchableProfile } from '../src/utils/matchScore';
import { computeMatchScore } from '../src/utils/matchScore';

const job = (overrides: Partial<MatchableJob> = {}): MatchableJob => ({
  type: 'Presencial',
  contractType: 'CLT',
  ...overrides,
});

describe('deterministic beta match', () => {
  test('empty profile produces low confidence instead of invented incompatibility', () => {
    const result = computeMatchScore(job({ area: 'Tech & Engenharia' }), {});
    assert.equal(result.score, 0);
    assert.equal(result.confidence, 'low');
    assert.equal(result.dataCompleteness, 0);
    assert.ok(result.missingData.includes('Área do perfil'));
  });

  test('undisclosed salary does not lower the compatibility score', () => {
    const profile: MatchableProfile = {
      area: 'Dados & Analytics',
      preferredMinSalary: 3000,
    };
    const withoutPreference = computeMatchScore(
      job({ area: 'Dados & Analytics', salary: 'A combinar', salaryDisclosed: false }),
      { area: profile.area },
    );
    const withPreference = computeMatchScore(
      job({ area: 'Dados & Analytics', salary: 'A combinar', salaryDisclosed: false }),
      profile,
    );
    assert.equal(withPreference.score, withoutPreference.score);
    assert.ok(withPreference.missingData.includes('Faixa salarial da vaga'));
  });

  test('considers every selected opportunity type', () => {
    const result = computeMatchScore(job({ contractType: 'CLT' }), {
      opportunityType: 'Internship',
      opportunityTypes: ['Internship', 'FirstJob'],
    });
    assert.equal(result.score, 100);
    assert.ok(result.reasons.some((reason) => reason.includes('objetivos')));
  });

  test('maps equivalent legacy areas to the same canonical id', () => {
    const result = computeMatchScore(job({ area: 'Direito & Compliance' }), {
      area: 'Jurídico',
    });
    assert.equal(result.score, 100);
  });

  test('matches any area selected by the candidate', () => {
    const result = computeMatchScore(job({ area: 'Finanças & Contabilidade' }), {
      area: 'Dados & Analytics',
      areas: ['Dados & Analytics', 'Finanças & Contabilidade'],
    });
    assert.equal(result.score, 100);
    assert.ok(result.reasons.includes('Área profissional compatível'));
  });

  test('matches competency aliases such as Excel variants', () => {
    const result = computeMatchScore(job({ requiredSkills: ['Microsoft Excel'] }), {
      skills: ['Pacote Office com Excel'],
    });
    assert.equal(result.score, 100);
    assert.deepEqual(result.matchedSkills, ['Microsoft Excel']);
    assert.deepEqual(result.missingRequiredSkills, []);
  });

  test('does not match similar but different short skills', () => {
    const result = computeMatchScore(job({ requiredSkills: ['JavaScript'] }), {
      skills: ['Java'],
    });
    assert.equal(result.score, 0);
    assert.deepEqual(result.matchedSkills, []);
    assert.deepEqual(result.missingRequiredSkills, ['JavaScript']);
  });

  test('evaluates modality only when the candidate informed it', () => {
    const mismatch = computeMatchScore(job({ type: 'Presencial' }), {
      preferredModes: ['Híbrido'],
    });
    const missingPreference = computeMatchScore(job({ type: 'Presencial' }), {});
    assert.equal(mismatch.score, 0);
    assert.equal(missingPreference.score, 0);
    assert.equal(mismatch.dataCompleteness, 20);
    assert.equal(missingPreference.dataCompleteness, 0);
  });

  test('remote vacancy is compatible with location and remote preference', () => {
    const result = computeMatchScore(job({
      type: 'Remoto',
      location: 'Remoto',
    }), {
      preferredModes: ['Remoto'],
      preferredCity: 'Recife',
      preferredState: 'PE',
    });
    assert.equal(result.score, 100);
    assert.ok(result.reasons.some((reason) => reason.includes('remota')));
  });

  test('matches legacy city and state text without canonical fields', () => {
    const result = computeMatchScore(job({
      type: 'Híbrido',
      location: 'São Paulo, SP',
    }), {
      preferredCity: 'São Paulo',
      preferredState: 'SP',
    });
    assert.equal(result.score, 100);
    assert.ok(result.reasons.some((reason) => reason.includes('Cidade')));
  });

  test('incomplete data can have a high score but never high confidence', () => {
    const result = computeMatchScore(job({ area: 'RH & Pessoas' }), {
      area: 'Recursos Humanos',
    });
    assert.equal(result.score, 100);
    assert.equal(result.confidence, 'low');
    assert.equal(result.dataCompleteness, 25);
  });

  test('always clamps the score between zero and one hundred', () => {
    const result = computeMatchScore(job({
      area: 'Marketing & Publicidade',
      type: 'Remoto',
      contractType: 'Estágio',
      location: 'Remoto',
      requiredSkills: ['Excel'],
      salary: 'R$ 2.000 - R$ 3.000',
      salaryDisclosed: true,
    }), {
      area: 'Marketing',
      preferredModes: ['Remoto'],
      opportunityType: 'Internship',
      preferredCity: 'Salvador',
      preferredState: 'BA',
      skills: ['Excel avançado'],
      preferredMinSalary: 1500,
      preferredMaxSalary: 3500,
    });
    assert.ok(result.score >= 0 && result.score <= 100);
    assert.equal(result.score, 100);
    assert.equal(result.confidence, 'high');
  });

  test('returns exactly the same result for repeated inputs', () => {
    const vacancy = job({
      area: 'Dados & Analytics',
      type: 'Híbrido',
      contractType: 'Trainee',
      city: 'São Paulo',
      state: 'SP',
      requiredSkills: ['SQL', 'Power BI'],
      differentials: ['Excel'],
    });
    const profile: MatchableProfile = {
      area: 'Dados',
      preferredModes: ['Híbrido'],
      opportunityTypes: ['Trainee'],
      preferredCity: 'São Paulo',
      preferredState: 'SP',
      skills: ['SQL', 'Microsoft Power BI'],
    };
    assert.deepEqual(computeMatchScore(vacancy, profile), computeMatchScore(vacancy, profile));
  });
});
