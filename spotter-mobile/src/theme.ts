import { configureFonts, MD3LightTheme } from 'react-native-paper';

export function driverTheme(customFonts: boolean) {
  const fonts = configureFonts({ config: { fontFamily: customFonts ? 'DMSans' : undefined } });
  if (customFonts) {
    for (const variant of ['displayLarge', 'displayMedium', 'displaySmall', 'headlineLarge',
      'headlineMedium', 'headlineSmall', 'titleLarge', 'titleMedium', 'titleSmall'] as const) {
      fonts[variant] = { ...fonts[variant], fontFamily: 'Manrope', fontWeight: 'normal' };
    }
  }
  return { ...MD3LightTheme, roundness: 5, fonts, colors: {
    ...MD3LightTheme.colors, primary: '#006B5E', onPrimary: '#FFFFFF',
    primaryContainer: '#B8F0DD', onPrimaryContainer: '#073C33',
    background: '#F5F4EE', surface: '#FFFEFA', surfaceVariant: '#E5EAE2',
    onSurface: '#193C35', onSurfaceVariant: '#465C52', secondary: '#57675D',
    outline: '#75877E', error: '#A12B32', errorContainer: '#FFE8E7',
  }};
}
