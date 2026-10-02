import React from 'react';
import { fireEvent, render } from '@testing-library/react-native';
import type { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { CVUploadScreen } from '../../src/screens/onboarding/CVUploadScreen';
import type { OnboardingStackParamList } from '../../src/types';
import { CV_AI_CONSENT_VERSION as mockConsentVersion, CV_AI_PROVIDER as mockProvider } from '../../src/constants/legal';

const mockParse = jest.fn();
const mockStoredCv = { fileName: 'anterior.pdf', sizeBytes: 100, uploadedAt: 1, contentType: 'application/pdf' };
jest.mock('../../src/hooks/useAuth', () => ({ useAuth: () => ({ user: { uid: 'a' }, profile: {
  cv: mockStoredCv, cvAiConsentGranted: true,
  cvAiConsentVersion: mockConsentVersion, cvAiConsentProvider: mockProvider,
} }) }));
jest.mock('../../src/contexts/OptionalCvFlowContext', () => ({ useOptionalCvFlow: () => undefined }));
jest.mock('../../src/services/cvParser', () => ({ parseCVFromUri: (...args: unknown[]) => mockParse(...args) }));
jest.mock('../../src/services/consent', () => ({ recordCvAiConsent: jest.fn() }));
jest.mock('../../src/services/monitoring', () => ({ captureException: jest.fn() }));
jest.mock('../../src/services/aiClient', () => ({ AiClientError: class extends Error {} }));
jest.mock('../../src/services/aiAvailability', () => ({ describeAiError: jest.fn() }));
jest.mock('../../src/utils/analytics', () => ({ track: jest.fn() }));
jest.mock('lucide-react-native', () => ({ Check: () => null, FileText: () => null }));
jest.mock('../../src/components/onboarding/OnboardingShell', () => {
  const { View } = jest.requireActual('react-native');
  return { OnboardingShell: ({ children, footer }: React.PropsWithChildren<{ footer: React.ReactNode }>) => <View>{children}{footer}</View> };
});
jest.mock('../../src/components/common/CVPicker', () => {
  const { View, Button } = jest.requireActual('react-native');
  return { CVPicker: ({ onBusyChange, onChange, onUploaded }: {
    onBusyChange: (busy: boolean) => void;
    onChange: (cv: typeof mockStoredCv | null) => void;
    onUploaded: (info: { uri: string; fileName: string; sizeBytes: number }) => void;
  }) => <View>
    <Button title="Iniciar upload" onPress={() => onBusyChange(true)} />
    <Button title="Concluir upload" onPress={() => {
      onChange({ ...mockStoredCv, fileName: 'novo.pdf' });
      onUploaded({ uri: 'file:///novo.pdf', fileName: 'novo.pdf', sizeBytes: 100 });
      onBusyChange(false);
    }} />
    <Button title="Remover PDF" onPress={() => onChange(null)} />
  </View> };
});

const mockNavigate = jest.fn();
const navigation = { navigate: mockNavigate, goBack: jest.fn() } as unknown as NativeStackNavigationProp<OnboardingStackParamList, 'CVUpload'>;

test('cadastro espera upload terminar antes de avançar', () => {
  const screen = render(<CVUploadScreen navigation={navigation} />);
  fireEvent.press(screen.getByText('Iniciar upload'));
  fireEvent.press(screen.getByRole('button', { name: 'Salvando currículo…', disabled: true }));
  expect(mockNavigate).not.toHaveBeenCalled();
  expect(mockParse).not.toHaveBeenCalled();
});

test('remover o PDF elimina a referência de análise mesmo antes de atualizar o perfil remoto', () => {
  const screen = render(<CVUploadScreen navigation={navigation} />);
  fireEvent.press(screen.getByText('Concluir upload'));
  fireEvent.press(screen.getByText('Remover PDF'));
  fireEvent.press(screen.getByRole('button', { name: 'Continuar sem currículo' }));
  expect(mockParse).not.toHaveBeenCalled();
  expect(mockNavigate).toHaveBeenCalledWith('MatchIntro', { hasCv: false });
});
