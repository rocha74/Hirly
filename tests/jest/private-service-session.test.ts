import { getDoc, getDocFromCache, getDocs, getDocsFromCache } from 'firebase/firestore';
import { httpsCallable } from 'firebase/functions';
import { auth } from '../../src/services/firebase';
import { loadApplicationQueue } from '../../src/services/applicationQueue';
import {
  getExternalApplicationSessionErrorMessage,
  loadExternalApplicationSession,
} from '../../src/services/externalApplicationSession';
import { prepareApplicationPackage } from '../../src/services/applicationPackage';
import { callAiFeature } from '../../src/services/aiClient';

jest.mock('../../src/services/firebase', () => ({
  auth: { currentUser: { uid: 'alice' } }, db: {}, functions: {}, storage: {},
}));
jest.mock('../../src/services/monitoring', () => ({ captureException: jest.fn() }));
jest.mock('../../src/utils/analytics', () => ({ track: jest.fn() }));
jest.mock('../../src/features/apply/analytics/tracking', () => ({ trackApplyEvent: jest.fn() }));
jest.mock('firebase/firestore', () => ({
  doc: jest.fn(), collection: jest.fn(),
  getDoc: jest.fn(), getDocFromCache: jest.fn(), getDocs: jest.fn(), getDocsFromCache: jest.fn(),
}));
jest.mock('firebase/functions', () => ({ httpsCallable: jest.fn() }));
jest.mock('firebase/storage', () => ({ getDownloadURL: jest.fn(), ref: jest.fn() }));

const setUser = (uid: string) => { (auth as unknown as { currentUser: { uid: string } }).currentUser = { uid }; };
const missingDoc = { exists: () => false };
const emptyQueue = { docs: [], metadata: { fromCache: false } };

beforeEach(() => {
  jest.resetAllMocks();
  setUser('alice');
  jest.mocked(getDocFromCache).mockResolvedValue(missingDoc as never);
  jest.mocked(getDocsFromCache).mockResolvedValue(emptyQueue as never);
});

describe('private asynchronous services', () => {
  it.each(['permission-denied', 'unauthenticated'])('does not mask %s using queue cache', async (code) => {
    jest.mocked(getDocs).mockRejectedValue({ code });
    await expect(loadApplicationQueue()).rejects.toMatchObject({ code });
    expect(getDocsFromCache).not.toHaveBeenCalled();
  });

  it('retains offline queue access for the same account', async () => {
    jest.mocked(getDocs).mockRejectedValue({ code: 'unavailable' });
    await expect(loadApplicationQueue()).resolves.toEqual({ items: [], source: 'cache' });
  });

  it('labels an SDK cache result correctly', async () => {
    jest.mocked(getDocs).mockResolvedValue({ ...emptyQueue, metadata: { fromCache: true } } as never);
    await expect(loadApplicationQueue()).resolves.toEqual({ items: [], source: 'cache' });
  });

  it('discards queue data when accounts change during the request', async () => {
    jest.mocked(getDocs).mockImplementation(async () => {
      setUser('bob');
      return emptyQueue as never;
    });
    await expect(loadApplicationQueue()).rejects.toThrow('AUTH_SESSION_CHANGED');
    expect(getDocsFromCache).not.toHaveBeenCalled();
  });

  it('does not recover a forbidden external session from cache', async () => {
    jest.mocked(getDoc).mockRejectedValue({ code: 'permission-denied' });
    await expect(loadExternalApplicationSession('job-1')).rejects.toMatchObject({ code: 'permission-denied' });
    expect(getDocFromCache).not.toHaveBeenCalled();
  });

  it('does not hide concurrent changes with a cached session', async () => {
    const error = { code: 'functions/aborted', message: 'STALE_SESSION' };
    jest.mocked(getDoc).mockRejectedValue(error);
    await expect(loadExternalApplicationSession('job-1')).rejects.toEqual(error);
    expect(getDocFromCache).not.toHaveBeenCalled();
    expect(getExternalApplicationSessionErrorMessage(error, 'Falha')).toContain('Recarregue');
    expect(getExternalApplicationSessionErrorMessage({ code: 'unavailable' }, 'Falha')).toBe('Falha');
  });

  it('discards external-session cache when the account changes while offline', async () => {
    jest.mocked(getDoc).mockRejectedValue({ code: 'unavailable' });
    jest.mocked(getDocFromCache).mockImplementation(async () => {
      setUser('bob');
      return missingDoc as never;
    });
    await expect(loadExternalApplicationSession('job-1')).rejects.toThrow('AUTH_SESSION_CHANGED');
  });

  it('does not load another account package after generation finishes', async () => {
    jest.mocked(httpsCallable).mockReturnValue((async () => {
      setUser('bob');
      return { data: { packageId: 'job-1' } };
    }) as never);
    await expect(prepareApplicationPackage('job-1')).rejects.toThrow('AUTH_SESSION_CHANGED');
    expect(getDoc).not.toHaveBeenCalled();
  });

  it('discards private AI output when the authenticated account changes', async () => {
    jest.mocked(httpsCallable).mockReturnValue((async () => {
      setUser('bob');
      return { data: { schemaVersion: '1', data: { score: 50 } } };
    }) as never);
    await expect(callAiFeature({ feature: 'cv_coach', payload: { profile: {} } as never }))
      .rejects.toMatchObject({ code: 'temporarily_unavailable' });
  });
});
