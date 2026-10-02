import assert from 'node:assert/strict';
import { describe, test } from 'node:test';
import type { Job } from '../src/types';
import {
  openExternalApplication,
  validateApplicationUrl,
  type ApplicationLinkDependencies,
} from '../src/services/externalApplication';
import {
  removePendingApplication,
  resolveApplicationConfirmation,
  shouldShowConfirmationOnAppState,
  upsertPendingApplication,
  type PendingApplicationConfirmation,
} from '../src/services/applicationFlowState';

const job = {
  id: 'job-1',
  title: 'Estagio em Produto',
  company: 'Hirly Labs',
  location: 'Remoto',
  applyUrl: 'https://jobs.example.com/apply?id=1',
} as Job;

const dependencies = (
  overrides: Partial<ApplicationLinkDependencies> = {},
): { deps: ApplicationLinkDependencies; calls: string[] } => {
  const calls: string[] = [];
  return {
    calls,
    deps: {
      canOpenURL: async () => {
        calls.push('canOpenURL');
        return true;
      },
      openURL: async () => {
        calls.push('openURL');
      },
      recordApplyOpened: async () => {
        calls.push('recordApplyOpened');
      },
      isApplicationConfirmed: async () => {
        calls.push('isApplicationConfirmed');
        return false;
      },
      track: (event) => {
        calls.push(event);
      },
      onInternalError: (stage) => {
        calls.push(`internal:${stage}`);
      },
      ...overrides,
    },
  };
};

const pendingItem = (jobId = 'job-1'): PendingApplicationConfirmation => ({
  job: {
    jobId,
    title: job.title,
    company: job.company,
    location: job.location,
    applyUrl: job.applyUrl,
  },
  applicationSource: 'job_detail',
  openedAt: 100,
});

describe('external application cycle', () => {
  test('validates only external HTTPS URLs without embedded credentials', () => {
    assert.equal(validateApplicationUrl(job.applyUrl), job.applyUrl);
    assert.equal(validateApplicationUrl('http://jobs.example.com/apply'), null);
    assert.equal(validateApplicationUrl('javascript:alert(1)'), null);
    assert.equal(validateApplicationUrl('https://user:pass@example.com'), null);
    assert.equal(validateApplicationUrl('not a url'), null);
  });

  test('records apply_opened, opens the link and does not confirm automatically', async () => {
    const { deps, calls } = dependencies();
    const result = await openExternalApplication(job, 'job_detail', deps);
    assert.deepEqual(result, { ok: true, url: job.applyUrl, needsConfirmation: true });
    assert.ok(calls.indexOf('recordApplyOpened') < calls.indexOf('openURL'));
    assert.equal(calls.includes('application_confirmed'), false);
    assert.equal(calls.includes('apply_link_opened'), true);
  });

  test('invalid URL neither records nor opens an application', async () => {
    const { deps, calls } = dependencies();
    const result = await openExternalApplication(
      { ...job, applyUrl: 'invalid' },
      'job_detail',
      deps,
    );
    assert.deepEqual(result, { ok: false, url: 'invalid', reason: 'invalid_url' });
    assert.equal(calls.includes('recordApplyOpened'), false);
    assert.equal(calls.includes('openURL'), false);
  });

  test('unsupported URL and open failure never request confirmation', async () => {
    const unsupported = dependencies({ canOpenURL: async () => false });
    assert.deepEqual(
      await openExternalApplication(job, 'application_plan', unsupported.deps),
      { ok: false, url: job.applyUrl, reason: 'unsupported_url' },
    );
    assert.equal(unsupported.calls.includes('openURL'), false);

    const failing = dependencies({ openURL: async () => { throw new Error('failed'); } });
    assert.deepEqual(
      await openExternalApplication(job, 'job_detail', failing.deps),
      { ok: false, url: job.applyUrl, reason: 'open_failed' },
    );
  });

  test('already confirmed application opens without creating another prompt', async () => {
    const { deps } = dependencies({ isApplicationConfirmed: async () => true });
    const result = await openExternalApplication(job, 'job_detail', deps);
    assert.deepEqual(result, { ok: true, url: job.applyUrl, needsConfirmation: false });
  });
});

describe('foreground confirmation state', () => {
  test('shows confirmation only when returning from background with pending work', () => {
    assert.equal(shouldShowConfirmationOnAppState('background', 'active', true), true);
    assert.equal(shouldShowConfirmationOnAppState('inactive', 'active', true), true);
    assert.equal(shouldShowConfirmationOnAppState('active', 'active', true), false);
    assert.equal(shouldShowConfirmationOnAppState('background', 'active', false), false);
  });

  test('deduplicates pending confirmations by job', () => {
    const first = pendingItem();
    const newer = { ...first, openedAt: 200 };
    const result = upsertPendingApplication([first], newer);
    assert.equal(result.length, 1);
    assert.equal(result[0].openedAt, 200);
    assert.deepEqual(removePendingApplication(result, 'job-1'), []);
  });

  test('only explicit confirmation invokes confirm', async () => {
    const calls: string[] = [];
    const deps = {
      confirm: async () => { calls.push('confirm'); },
      remove: async () => { calls.push('remove'); },
      trackNotCompleted: () => { calls.push('not_completed'); },
    };
    await resolveApplicationConfirmation('remind_later', pendingItem(), deps);
    assert.deepEqual(calls, []);
    await resolveApplicationConfirmation('not_completed', pendingItem(), deps);
    assert.deepEqual(calls, ['not_completed', 'remove']);
    calls.length = 0;
    await resolveApplicationConfirmation('confirmed', pendingItem(), deps);
    assert.deepEqual(calls, ['confirm', 'remove']);
  });

  test('failed confirmation keeps the reminder for a later retry', async () => {
    const calls: string[] = [];
    await assert.rejects(resolveApplicationConfirmation('confirmed', pendingItem(), {
      confirm: async () => { throw new Error('offline'); },
      remove: async () => { calls.push('remove'); },
      trackNotCompleted: () => undefined,
    }));
    assert.deepEqual(calls, []);
  });
});
