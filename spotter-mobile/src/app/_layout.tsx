import { Stack } from 'expo-router';
import { MD3LightTheme, PaperProvider } from 'react-native-paper';
import { SafeAreaProvider } from 'react-native-safe-area-context';
const theme = { ...MD3LightTheme, colors: {
  ...MD3LightTheme.colors, primary: '#006B5E', onPrimary: '#FFFFFF',
  primaryContainer: '#B8F0DD', background: '#F5F4EE', surface: '#FFFEFA',
  onSurface: '#193C35', secondary: '#57675D', outline: '#75877E',
}};
export default function Layout() {
  return <SafeAreaProvider><PaperProvider theme={theme}>
    <Stack screenOptions={{ headerShown: false }} />
  </PaperProvider></SafeAreaProvider>;
}
