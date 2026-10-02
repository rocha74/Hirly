import React, { useContext } from 'react';
import { Alert, AppState, Linking } from 'react-native';
import { act, renderHook } from '@testing-library/react-native';
import { ApplicationFlowProvider } from '../../src/providers/ApplicationFlowProvider';
import { ApplicationFlowContext } from '../../src/contexts/ApplicationFlowContext';
import type { Job } from '../../src/types';

let mockUid = 'a';
const mockConfirm = jest.fn();
const mockCheckConfirmed = jest.fn();
const mockRecordOpen = jest.fn();
const mockGetItem = jest.fn();
const mockRemoveItem = jest.fn();
jest.mock('../../src/hooks/useAuth', () => ({ useAuth: () => ({ user: { uid: mockUid }, onboardingState: 'complete' }) }));
jest.mock('../../src/services/firebase', () => ({ get auth() { return { currentUser: { uid: mockUid } }; } }));
jest.mock('../../src/services/applications', () => ({
  confirmApplication: (...args: unknown[]) => mockConfirm(...args),
  isApplicationConfirmed: (...args: unknown[]) => mockCheckConfirmed(...args),
  toApplicationJobSnapshot: (job: Job) => ({ ...job, jobId: job.id }),
}));
jest.mock('../../src/services/jobInteractions', () => ({ recordApplyOpened: (...args: unknown[]) => mockRecordOpen(...args), reportJob: jest.fn() }));
jest.mock('../../src/services/monitoring', () => ({ captureException: jest.fn() }));
jest.mock('../../src/utils/analytics', () => ({ track: jest.fn() }));
jest.mock('@react-native-async-storage/async-storage', () => ({
  getItem: (...args: unknown[]) => mockGetItem(...args),
  removeItem: (...args: unknown[]) => mockRemoveItem(...args),
  setItem: jest.fn().mockResolvedValue(undefined),
}));
jest.mock('expo-haptics', () => ({ notificationAsync: jest.fn().mockResolvedValue(undefined), NotificationFeedbackType: { Success: 'success' } }));
jest.mock('expo-clipboard', () => ({ setStringAsync: jest.fn() }));

const wrapper: React.FC<React.PropsWithChildren> = ({ children }) => <ApplicationFlowProvider>{children}</ApplicationFlowProvider>;
const pending = JSON.stringify([{ job: { jobId: 'vaga-a', title: 'Estágio', company: 'Empresa', location: 'SP', applyUrl: 'https://example.test/apply' }, applicationSource: 'job_detail', openedAt: 1 }]);

beforeEach(() => {
  AppState.currentState = 'active';
  mockUid = 'a';
  mockGetItem.mockReset().mockResolvedValue(null);
  mockCheckConfirmed.mockReset().mockResolvedValue(false);
  jest.spyOn(Alert, 'alert').mockImplementation(() => undefined);
  jest.spyOn(Linking, 'canOpenURL').mockResolvedValue(true);
  jest.spyOn(Linking, 'openURL').mockResolvedValue(undefined);
});
afterEach(() => { jest.useRealTimers(); jest.restoreAllMocks(); });

test('confirmar alerta antigo após trocar de conta não cria candidatura na nova conta', async () => {
  jest.useFakeTimers();
  mockGetItem.mockResolvedValueOnce(pending);
  const { rerender } = renderHook(() => useContext(ApplicationFlowContext), { wrapper });
  await act(async () => { await Promise.resolve(); });
  act(() => jest.advanceTimersByTime(350));
  const confirm = jest.mocked(Alert.alert).mock.calls[0]?.[2]?.find((button) => button.text === 'Sim, me candidatei');
  expect(confirm).toBeDefined();
  mockUid = 'b';
  rerender({});
  await act(async () => { confirm?.onPress?.(); });
  expect(mockConfirm).not.toHaveBeenCalled();
  expect(mockRemoveItem).not.toHaveBeenCalled();
});

test('trocar conta durante a consulta inicial cancela histórico e abertura externa', async () => {
  let resolve!: (confirmed: boolean) => void;
  mockCheckConfirmed.mockReturnValue(new Promise((done) => { resolve = done; }));
  const { result, rerender } = renderHook(() => useContext(ApplicationFlowContext)!, { wrapper });
  let opening!: Promise<boolean>;
  act(() => { opening = result.current.openApplication({ id: 'vaga-a', applyUrl: 'https://example.test/apply' } as Job, 'job_detail'); });
  mockUid = 'b';
  rerender({});
  await act(async () => { resolve(false); expect(await opening).toBe(false); });
  expect(mockRecordOpen).not.toHaveBeenCalled();
  expect(Linking.openURL).not.toHaveBeenCalled();
});
