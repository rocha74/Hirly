import { EVAL_SUITE_NAMES, runAllEvalSuites } from '../../src/services/evalRunner';

describe('AI quality regression suite', () => {
  test('não aceita falhas bloqueadoras ou altas nos casos críticos', () => {
    const report = runAllEvalSuites({
      promptVersion: 'quality-gate',
      model: 'deterministic-fixtures',
    });
    const criticalFailures = report.cases.flatMap((testCase) =>
      testCase.checks.filter((check) =>
        check.status === 'fail' && (check.severity === 'blocker' || check.severity === 'high')),
    );

    expect(report.totalCases).toBeGreaterThanOrEqual(EVAL_SUITE_NAMES.length);
    expect(criticalFailures).toEqual([]);
  });

  test('cobre proveniência, contradição, currículo e segurança de vaga', () => {
    const report = runAllEvalSuites();
    const ids = new Set(report.cases.map((testCase) => testCase.id));

    expect(ids.has('pitch_no_unsupported_claims')).toBe(true);
    expect(ids.has('match_explanation_grounded')).toBe(true);
    expect(ids.has('resume_parser_student_profile')).toBe(true);
    expect(ids.has('job_safety_paid_fee')).toBe(true);
  });
});
