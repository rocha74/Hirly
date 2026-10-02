import { Timestamp } from 'firebase/firestore';
import {
  resolveApplicationConfirmation,
  shouldShowConfirmationOnAppState,
  upsertPendingApplication,
  type PendingApplicationConfirmation,
} from '../../src/services/applicationFlowState';
import { normalizeStoredApplication } from '../../src/services/applicationMigration';

const pending: PendingApplicationConfirmation = {
  job: {
    jobId: 'job-1',
    title: 'Estágio em Produto',
    company: 'Empresa',
    location: 'Remoto',
    applyUrl: 'https://example.com/apply',
  },
  applicationSource: 'job_detail',
  openedAt: 100,
};

describe('application confirmation state', () => {
  test('prompts only after returning with pending work and deduplicates jobs', () => {
    expect(shouldShowConfirmationOnAppState('background', 'active', true)).toBe(true);
    expect(shouldShowConfirmationOnAppState('active', 'active', true)).toBe(false);
    expect(upsertPendingApplication([pending], { ...pending, openedAt: 200 })).toHaveLength(1);
  });

  test('only explicit confirmation creates an application', async () => {
    const confirm = jest.fn(async () => undefined);
    const remove = jest.fn(async () => undefined);
    const trackNotCompleted = jest.fn();
    await resolveApplicationConfirmation('remind_later', pending, {
      confirm, remove, trackNotCompleted,
    });
    expect(confirm).not.toHaveBeenCalled();
    await resolveApplicationConfirmation('confirmed', pending, {
      confirm, remove, trackNotCompleted,
    });
    expect(confirm).toHaveBeenCalledTimes(1);
  });
});

describe('legacy application compatibility', () => {
  test('hydrates the old nested job shape without destructive migration', () => {
    const appliedAt = Timestamp.fromMillis(123);
    const normalized = normalizeStoredApplication('legacy-job', {
      appliedAt,
      job: {
        title: 'Vaga antiga',
        company: 'Empresa antiga',
        location: 'Recife, PE',
        applyUrl: 'https://example.com/legacy',
      },
    });
    expect(normalized.jobId).toBe('legacy-job');
    expect(normalized.status).toBe('applied');
    expect(normalized.job.id).toBe('legacy-job');
    expect(normalized.job.title).toBe('Vaga antiga');
    expect(normalized.appliedAt).toBe(appliedAt);
  });

  test('keeps the current minimal snapshot shape', () => {
    const normalized = normalizeStoredApplication('doc-id', {
      jobId: 'job-2',
      title: 'Vaga atual',
      company: 'Empresa',
      location: 'Remoto',
      applyUrl: 'https://example.com/current',
      snapshotAt: Timestamp.fromMillis(456),
      confirmedByUser: true,
    });
    expect(normalized.job.id).toBe('job-2');
    expect(normalized.job.title).toBe('Vaga atual');
    expect(normalized.appliedAt.toMillis()).toBe(456);
    expect(normalized.job.type).toBe('');
    expect(normalized.job.contractType).toBe('');
    expect(normalized.job.isActive).toBe(false);
  });
});
