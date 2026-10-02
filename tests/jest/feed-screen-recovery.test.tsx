import React from 'react';
import { act, fireEvent, render } from '@testing-library/react-native';
import type { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { FeedScreen } from '../../src/screens/main/FeedScreen';
import type { MainStackParamList } from '../../src/types';

let mockFocused = true;
const mockLoadMore = jest.fn();
const mockClaimNudge = jest.fn();
const mockJobs = { jobs: [], loading: false, loadingMore: false, error: null, refreshError: null,
  loadMoreError: null as string | null, endReached: false, refetch: jest.fn(), loadMore: mockLoadMore };
jest.mock('@react-navigation/native', () => ({ useIsFocused: () => mockFocused }));
jest.mock('react-native-safe-area-context', () => jest.requireActual('react-native-safe-area-context/jest/mock').default);
jest.mock('lucide-react-native', () => new Proxy({}, { get: () => () => null }));
jest.mock('../../src/hooks/useJobs', () => ({ useJobs: () => mockJobs }));
jest.mock('../../src/hooks/useAuth', () => ({ useAuth: () => ({ user: { uid: 'a' }, profile: { name: 'Pessoa candidata' } }) }));
jest.mock('../../src/hooks/useFeedInteractions', () => ({ useFeedInteractions: () => ({
  passedIds: new Set(), explicitlyRejectedIds: new Set(), likedIds: new Set(), appliedIds: new Set(),
  recentlyViewedIds: new Set(), lastViewedAtById: new Map(), loading: false, error: null, retry: jest.fn(),
}) }));
jest.mock('../../src/services/likes', () => ({ likeJob: jest.fn() }));
jest.mock('../../src/services/jobInteractions', () => ({ passJob: jest.fn(), recordJobImpression: jest.fn() }));
jest.mock('../../src/services/feedback', () => ({ recordFeedbackEligibleAction: jest.fn() }));
jest.mock('../../src/services/feedPrompts', () => ({ claimCvNudge: (...args: unknown[]) => mockClaimNudge(...args), CV_NUDGE_DELAY_MS: 1000 }));
jest.mock('../../src/services/monitoring', () => ({ captureException: jest.fn() }));
jest.mock('../../src/utils/analytics', () => ({ track: jest.fn() }));
jest.mock('../../src/utils/matchScore', () => ({ computeMatchScore: () => ({ score: 0 }) }));
jest.mock('../../src/utils/profileCompleteness', () => ({ computeProfileCompleteness: () => ({ missing: ['currículo'] }) }));
jest.mock('../../src/components/job/JobCard', () => ({ JobCard: () => null }));
jest.mock('../../src/components/job/JobCardSkeleton', () => ({ JobCardSkeleton: () => null }));
jest.mock('../../src/components/common/Logo', () => ({ Logo: () => null }));
jest.mock('../../src/components/system/MainDock', () => ({ MainDock: () => null }));
jest.mock('../../src/components/filters/FeedFiltersSheet', () => ({ FeedFiltersSheet: () => null }));
jest.mock('../../src/components/feed/FeedPromptModal', () => ({ FeedPromptModal: () => null }));
jest.mock('../../src/components/common/Toast', () => ({ Toast: () => null }));

const navigation = { navigate: jest.fn() } as unknown as NativeStackNavigationProp<MainStackParamList, 'Feed'>;
beforeEach(() => {
  mockFocused = true;
  mockJobs.loadMoreError = null;
  mockJobs.endReached = false;
  mockClaimNudge.mockReset().mockResolvedValue(false);
});
afterEach(() => jest.useRealTimers());

test('falha de paginação para as tentativas automáticas e oferece retry explícito', () => {
  mockJobs.loadMoreError = 'Falha ao buscar mais vagas';
  const screen = render(<FeedScreen navigation={navigation} />);
  expect(mockLoadMore).not.toHaveBeenCalled();
  fireEvent.press(screen.getByRole('button', { name: 'Tentar novamente' }));
  expect(mockLoadMore).toHaveBeenCalledTimes(1);
});

test('abrir outra tela cancela o convite de currículo ainda aguardando tempo', () => {
  jest.useFakeTimers();
  mockJobs.endReached = true;
  const screen = render(<FeedScreen navigation={navigation} />);
  act(() => jest.advanceTimersByTime(500));
  mockFocused = false;
  screen.rerender(<FeedScreen navigation={navigation} />);
  act(() => jest.advanceTimersByTime(1000));
  expect(mockClaimNudge).not.toHaveBeenCalled();
});
