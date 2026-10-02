import type { UserProfile } from '../../src/types';
import {
  canonicalAreaId,
  canonicalCompetencyId,
  canonicalOpportunityTypeId,
} from '../../src/constants/taxonomy';
import { computeMatchScore, matchDataCoverageLabel, type MatchableJob } from '../../src/utils/matchScore';
import { parseSalaryRange } from '../../src/utils/salary';

const job: MatchableJob = {
  title: 'Estágio em Dados',
  company: 'Empresa',
  type: 'Remoto',
  contractType: 'Estágio',
  location: 'Remoto',
  area: 'Dados & Analytics',
  requiredSkills: ['Microsoft Excel'],
  skills: [],
  differentials: [],
  benefits: [],
  description: '',
  salary: '',
};

describe('match score and canonical taxonomy', () => {
  test('descreve cobertura como dados, não como probabilidade de confiança', () => {
    expect(matchDataCoverageLabel(80)).toBe('Dados: 80%');
    expect(matchDataCoverageLabel(200)).toBe('Dados: 100%');
    expect(matchDataCoverageLabel(-1)).toBe('Dados: 0%');
    expect(matchDataCoverageLabel(NaN)).toBe('Dados: 0%');
  });
  test('normalizes legacy labels and avoids short substring matching', () => {
    expect(canonicalAreaId('Jurídico')).toBe('legal_compliance');
    expect(canonicalAreaId('Direito & Compliance')).toBe('legal_compliance');
    expect(canonicalOpportunityTypeId('Primeiro emprego')).toBe('first_job');
    expect(canonicalCompetencyId('Excel intermediário')).toBe('skill:excel');
    expect(canonicalCompetencyId('Java')).not.toBe(canonicalCompetencyId('JavaScript'));
  });

  test('is deterministic and does not penalize undisclosed salary', () => {
    const profile = {
      area: 'Dados',
      opportunityTypes: ['Internship', 'FirstJob'],
      preferredModes: ['Remoto'],
      skills: ['Excel'],
      preferredLocation: 'Remoto',
      preferredMinSalary: 1500,
    } as Partial<UserProfile>;
    const first = computeMatchScore(job, profile);
    const second = computeMatchScore(job, profile);
    expect(first).toEqual(second);
    expect(first.score).toBeGreaterThanOrEqual(0);
    expect(first.score).toBeLessThanOrEqual(100);
    expect(first.missingData).toContain('Faixa salarial da vaga');
    expect(first.matchedSkills).toEqual(['Microsoft Excel']);
  });

  test('empty data lowers confidence instead of inventing precision', () => {
    const result = computeMatchScore(job, {});
    expect(result.confidence).toBe('low');
    expect(result.dataCompleteness).toBeLessThan(50);
  });
});

describe('salary parser', () => {
  test.each([
    ['R$ 1.500 a R$ 2.000', { min: 1500, max: 2000 }],
    ['Bolsa de 1800', { min: 1800, max: 1800 }],
    [undefined, null],
    ['A combinar', null],
  ])('parses %s without inventing values', (value, expected) => {
    expect(parseSalaryRange(value)).toEqual(expected);
  });
});
