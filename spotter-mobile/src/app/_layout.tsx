import { Stack } from 'expo-router';
import { useFonts } from 'expo-font';
import { PaperProvider } from 'react-native-paper';
import { SafeAreaProvider } from 'react-native-safe-area-context';
import { driverTheme } from '../theme';

export default function Layout() {
  const [loaded] = useFonts({
    Manrope: require('../../assets/fonts/Manrope.ttf'),
    DMSans: require('../../assets/fonts/DMSans.ttf'),
  });
  // Keep the app usable with system fonts while loading, or if loading fails.
  return <SafeAreaProvider><PaperProvider theme={driverTheme(loaded)}>
    <Stack screenOptions={{ headerShown: false }} />
  </PaperProvider></SafeAreaProvider>;
}
