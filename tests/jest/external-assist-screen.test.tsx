import React from 'react';
import { act, fireEvent, render, waitFor } from '@testing-library/react-native';
import type { NativeStackScreenProps } from '@react-navigation/native-stack';
import { ExternalApplicationAssistScreen } from '../../src/screens/main/ExternalApplicationAssistScreen';
import type { MainStackParamList } from '../../src/types';

const mockLoadSession = jest.fn();
const mockLoadPackage = jest.fn();
const mockOpenResume = jest.fn();
const mockToggle = jest.fn();
const mockFinish = jest.fn();
const mockOpenSite = jest.fn();
const mockSession = {
  id: 'session-1', packageId: 'package-1', status: 'in_progress', resumeId: 'resume-1',
  externalUrl: 'https://jobs.example.test/apply', copiedAnswers: [], completedFieldIds: [],
  jobSnapshot: { title: 'Estágio', company: 'Empresa teste' },
  checklist: [{ id: 'attach_resume', label: 'Anexar currículo', completed: false, required: true }],
};
jest.mock('../../src/hooks/useAuth', () => ({ useAuth: () => ({ user: { uid: 'candidate-1' } }) }));
jest.mock('../../src/services/firebase', () => ({ auth: { currentUser: { uid: 'candidate-1' } } }));
jest.mock('../../src/services/externalApplicationSession', () => ({
  loadExternalApplicationSession: (...args: unknown[]) => mockLoadSession(...args),
  openSessionResume: (...args: unknown[]) => mockOpenResume(...args),
  toggleExternalSessionTarget: (...args: unknown[]) => mockToggle(...args),
  completeExternalApplicationSession: (...args: unknown[]) => mockFinish(...args),
  markExternalApplicationSessionOpened: (...args: unknown[]) => mockOpenSite(...args),
  markExternalAnswerCopied: jest.fn(),
  getExternalApplicationSessionErrorMessage: (_error: unknown, fallback: string) => fallback,
}));
jest.mock('../../src/services/applicationPackage', () => ({ loadApplicationPackage: (...args: unknown[]) => mockLoadPackage(...args) }));
jest.mock('../../src/services/monitoring', () => ({ captureException: jest.fn() }));
jest.mock('lucide-react-native', () => new Proxy({}, { get: () => () => null }));
jest.mock('../../src/features/apply/external', () => ({
  externalDestinationLabel: () => 'site da empresa',
  selectExternalApplicationAdapter: () => ({ createPlan: () => ({
    fields: [{ id: 'email', label: 'E-mail', value: 'candidato@example.test', confirmed: true }],
    fallbackMessage: 'Preencha no site.',
  }) }),
}));
jest.mock('react-native-safe-area-context', () => jest.requireActual('react-native-safe-area-context/jest/mock').default);
jest.mock('expo-clipboard', () => ({ setStringAsync: jest.fn().mockResolvedValue(undefined) }));
jest.mock('expo-haptics', () => ({
  selectionAsync: jest.fn().mockResolvedValue(undefined),
  notificationAsync: jest.fn().mockResolvedValue(undefined),
  NotificationFeedbackType: { Success: 'success', Warning: 'warning' },
}));

type Props = NativeStackScreenProps<MainStackParamList, 'ExternalApplicationAssist'>;
const mockNavigate = jest.fn();
const props = { navigation: { navigate: mockNavigate, goBack: jest.fn() }, route: { params: { sessionId: 'session-1' } } } as unknown as Props;

beforeEach(() => {
  mockLoadSession.mockReset().mockResolvedValue(mockSession);
  mockLoadPackage.mockReset().mockResolvedValue({ answers: [] });
  mockOpenResume.mockReset().mockResolvedValue(undefined);
  mockFinish.mockReset().mockResolvedValue({ ...mockSession, status: 'awaiting_confirmation' });
});

test('falha de carregamento sai do spinner e permite recuperar a candidatura', async () => {
  mockLoadSession.mockRejectedValueOnce(new Error('offline'));
  const screen = render(<ExternalApplicationAssistScreen {...props} />);
  const retry = await screen.findByRole('button', { name: 'Tentar novamente' });
  expect(screen.queryByText('Carregando materiais da candidatura...')).toBeNull();
  fireEvent.press(retry);
  await screen.findByText('Estágio');
  expect(mockLoadSession).toHaveBeenCalledTimes(2);
});

test('abrir PDF e copiar dados não afirmam que foram anexados ou preenchidos', async () => {
  const screen = render(<ExternalApplicationAssistScreen {...props} />);
  await screen.findByText('Estágio');
  await act(async () => { fireEvent.press(screen.getByRole('button', { name: 'Abrir currículo recomendado' })); });
  await act(async () => { fireEvent.press(screen.getByRole('button', { name: 'Copiar E-mail' })); });
  expect(mockOpenResume).toHaveBeenCalledTimes(1);
  expect(mockToggle).not.toHaveBeenCalled();
  expect(screen.getByText('Voltar ao site')).toBeTruthy();
});

test('continuar depois salva a sessão e volta à lista de candidaturas', async () => {
  const screen = render(<ExternalApplicationAssistScreen {...props} />);
  await screen.findByText('Estágio');
  fireEvent.press(screen.getByText('Continuar depois'));
  await waitFor(() => expect(mockNavigate).toHaveBeenCalledWith('Applications'));
  expect(mockFinish).toHaveBeenCalledWith('session-1', 'remind_later', { failureReason: undefined });
});
