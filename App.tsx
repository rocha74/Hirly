import React, { useCallback, useEffect, useState } from 'react';
import { GestureHandlerRootView } from 'react-native-gesture-handler';
import { SafeAreaProvider } from 'react-native-safe-area-context';
import { StatusBar } from 'expo-status-bar';
import { useFonts } from 'expo-font';
import * as SplashScreen from 'expo-splash-screen';
import { Geist_400Regular } from '@expo-google-fonts/geist/400Regular';
import { Geist_500Medium } from '@expo-google-fonts/geist/500Medium';
import { Geist_600SemiBold } from '@expo-google-fonts/geist/600SemiBold';
import { Geist_700Bold } from '@expo-google-fonts/geist/700Bold';
import { Geist_800ExtraBold } from '@expo-google-fonts/geist/800ExtraBold';
import { Geist_900Black } from '@expo-google-fonts/geist/900Black';
import { JetBrainsMono_400Regular } from '@expo-google-fonts/jetbrains-mono/400Regular';
import { JetBrainsMono_500Medium } from '@expo-google-fonts/jetbrains-mono/500Medium';
import { JetBrainsMono_600SemiBold } from '@expo-google-fonts/jetbrains-mono/600SemiBold';
import { View } from 'react-native';
import { AppNavigator } from './src/navigation/AppNavigator';
import { AmbientBackdrop } from './src/components/common/AmbientBackdrop';
import { COLORS } from './src/theme/tokens';
import { AuthProvider } from './src/providers/AuthProvider';
import { ApplicationFlowProvider } from './src/providers/ApplicationFlowProvider';
import { GlobalErrorBoundary } from './src/components/common/GlobalErrorBoundary';
import { captureException } from './src/services/monitoring';

SplashScreen.preventAutoHideAsync().catch((error: unknown) => {
  captureException(error, { operation: 'splash_screen', stage: 'hold' });
});

function AppContent() {
  const [appReady, setAppReady] = useState(false);
  const [fontsLoaded, fontError] = useFonts({
    Geist_400Regular,
    Geist_500Medium,
    Geist_600SemiBold,
    Geist_700Bold,
    Geist_800ExtraBold,
    Geist_900Black,
    JetBrainsMono_400Regular,
    JetBrainsMono_500Medium,
    JetBrainsMono_600SemiBold,
  });

  useEffect(() => {
    if (fontsLoaded || fontError) {
      setAppReady(true);
    }
  }, [fontsLoaded, fontError]);

  const onLayoutRootView = useCallback(async () => {
    if (appReady) {
      await SplashScreen.hideAsync().catch((error: unknown) => {
        captureException(error, { operation: 'splash_screen', stage: 'hide' });
      });
    }
  }, [appReady]);

  if (!appReady) {
    return null;
  }

  return (
    <GestureHandlerRootView style={{ flex: 1 }} onLayout={onLayoutRootView}>
      <SafeAreaProvider>
        <AuthProvider>
          <ApplicationFlowProvider>
            <View style={{ flex: 1, backgroundColor: COLORS.bg }}>
              <StatusBar style="light" backgroundColor={COLORS.bg} />
              <AmbientBackdrop />
              <AppNavigator />
            </View>
          </ApplicationFlowProvider>
        </AuthProvider>
      </SafeAreaProvider>
    </GestureHandlerRootView>
  );
}

export default function App() {
  return (
    <GlobalErrorBoundary>
      <AppContent />
    </GlobalErrorBoundary>
  );
}
