import {
  APPLY_ANALYTICS_CATALOG,
  APPLY_ANALYTICS_EVENTS,
  classifyApplyAnswer,
} from '../../src/features/apply/analytics/contract';
import {
  calculateApplyMvpMetrics,
  type ApplyAnalyticsEventRecord,
} from '../../src/features/apply/analytics/metrics';

const MINUTE = 60_000;
const DAY = 86_400_000;
const BASE = Date.UTC(2026, 0, 1);

const event = (
  name: ApplyAnalyticsEventRecord['event'],
  userId: string,
  jobId: string,
  minute: number,
  properties: ApplyAnalyticsEventRecord['properties'] = {},
): ApplyAnalyticsEventRecord => ({
  event: name,
  userId,
  timestampMs: BASE + (minute * MINUTE),
  properties: { jobId, ...properties },
});

describe('Hirly Apply MVP analytics', () => {
  it('mantém catálogo e lista de eventos sincronizados', () => {
    expect(Object.keys(APPLY_ANALYTICS_CATALOG).sort()).toEqual([...APPLY_ANALYTICS_EVENTS].sort());
  });

  it('classifica respostas sem persistir o conteúdo', () => {
    expect(classifyApplyAnswer('Qual é sua pretensão salarial?')).toBe('salary_expectation');
    expect(classifyApplyAnswer('Quando você pode começar?')).toBe('availability');
    expect(classifyApplyAnswer(undefined, 'availability_start')).toBe('availability');
    expect(classifyApplyAnswer('Você tem autorização legal para trabalhar?')).toBe('legal');
  });

  it('calcula funil, esforço, qualidade, retenção e abandono por usuário e vaga', () => {
    const records: ApplyAnalyticsEventRecord[] = [
      event('recommendation_generated', 'u1', 'a', 0, { estimatedMinutes: 30 }),
      event('recommendation_opened', 'u1', 'a', 1),
      event('package_generation_started', 'u1', 'a', 2),
      event('package_generation_completed', 'u1', 'a', 3, {
        durationMs: MINUTE, reusedAnswerCount: 2,
      }),
      event('package_answer_edited', 'u1', 'a', 4, { answerCategory: 'salary_expectation' }),
      event('package_answer_edited', 'u1', 'a', 5, { answerCategory: 'salary_expectation' }),
      event('package_approved', 'u1', 'a', 6, { durationMs: 2 * MINUTE }),
      event('external_session_started', 'u1', 'a', 7),
      event('external_application_confirmed', 'u1', 'a', 12, { durationMs: 5 * MINUTE }),
      event('application_status_changed', 'u1', 'a', (3 * DAY) / MINUTE, { status: 'interviewing' }),
      event('queue_viewed', 'u1', 'none', (2 * DAY) / MINUTE, { resultCount: 1 }),

      event('recommendation_generated', 'u1', 'b', 0, { estimatedMinutes: 20 }),
      event('recommendation_rejected', 'u1', 'b', 1, { reason: 'location' }),

      event('recommendation_generated', 'u2', 'c', 0, { estimatedMinutes: 15 }),
      event('recommendation_opened', 'u2', 'c', 1),
      event('package_generation_started', 'u2', 'c', 2),
      event('package_generation_failed', 'u2', 'c', 3, { failureStage: 'generation' }),

      event('external_session_started', 'u2', 'd', 4),
      event('external_application_abandoned', 'u2', 'd', 8, { reason: 'abandoned' }),
      event('external_session_started', 'u2', 'e', 5),
      event('external_application_failed', 'u2', 'e', 9, { reason: 'site_error' }),
      event('external_failure_reason', 'u2', 'e', 9, { reason: 'site_error' }),
    ];

    const result = calculateApplyMvpMetrics(records, BASE + (10 * DAY));

    expect(result.funnel).toMatchObject({
      recommendations: 3,
      openedRecommendations: 2,
      recommendationOpenRate: 66.67,
      packagesStarted: 2,
      recommendationToPackageRate: 66.67,
      packagesCompleted: 1,
      packagesApproved: 1,
      packageApprovalRate: 100,
      externalSessionsStarted: 3,
      externalApplicationsConfirmed: 1,
      externalCompletionRate: 33.33,
    });
    expect(result.timing).toEqual({
      medianRecommendationToApplicationMinutes: 12,
      medianReviewMinutes: 2,
      estimatedMinutesSavedTotal: 22,
      estimatedMinutesSavedAverage: 22,
      measuredJourneys: 1,
    });
    expect(result.quality).toMatchObject({
      totalAnswerEdits: 2,
      averageEditsPerEditedPackage: 2,
      reusedAnswers: 2,
      errorRate: 40,
      mostEditedAnswerCategories: [{ key: 'salary_expectation', count: 2 }],
    });
    expect(result.outcomes).toEqual({
      completedApplications: 1,
      usersWithCompletedApplication: 1,
      completedApplicationsPerUser: 1,
      interviewsReported: 1,
      retentionAfterFirstApplication7dRate: 100,
      usersEligibleForRetention: 1,
    });
    expect(result.abandonment.explicitExternalAbandonments).toBe(1);
    expect(result.abandonment.stages[0]).toEqual({ key: 'external_not_confirmed', count: 2 });
    expect(result.abandonment.rejectionReasons).toEqual([{ key: 'location', count: 1 }]);
    expect(result.abandonment.externalFailureReasons).toEqual([{ key: 'site_error', count: 1 }]);
  });

  it('ignora durações inativas longas na estimativa de economia', () => {
    const records = [
      event('recommendation_generated', 'u1', 'a', 0, { estimatedMinutes: 30 }),
      event('package_generation_completed', 'u1', 'a', 1, { durationMs: MINUTE }),
      event('package_approved', 'u1', 'a', 2, { durationMs: 3 * 60 * MINUTE }),
      event('external_application_confirmed', 'u1', 'a', 3, { durationMs: MINUTE }),
    ];
    expect(calculateApplyMvpMetrics(records).timing.measuredJourneys).toBe(0);
  });
});
