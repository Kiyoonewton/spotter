import mockSafeArea from 'react-native-safe-area-context/jest/mock';
import { AccessibilityInfo } from 'react-native';
import { fireEvent, render, waitFor } from '@testing-library/react-native';
import { PaperProvider } from 'react-native-paper';
import { router } from 'expo-router';
import WelcomeScreen from '../app/index';
jest.mock('expo-router', () => ({ router: { replace: jest.fn() } }));
jest.mock('expo-image', () => ({ Image: 'Image' }));
jest.mock('react-native-safe-area-context', () => mockSafeArea);
afterEach(() => jest.restoreAllMocks());
test('shows the GIF with pause and enters the main screen only on action', async () => {
  jest.spyOn(AccessibilityInfo, 'isReduceMotionEnabled').mockResolvedValue(false);
  const screen = await render(<PaperProvider><WelcomeScreen /></PaperProvider>);
  await waitFor(() => expect(screen.getByTestId('welcome-image').props.autoplay).toBe(true));
  await fireEvent.press(screen.getByText('Pause illustration'));
  expect(screen.getByTestId('welcome-image').props.autoplay).toBe(false);
  await fireEvent.press(screen.getByText('Plan a trip'));
  expect(router.replace).toHaveBeenCalledWith('/trip');
});
test('keeps illustration static when the OS requests reduced motion', async () => {
  jest.spyOn(AccessibilityInfo, 'isReduceMotionEnabled').mockResolvedValue(true);
  const screen = await render(<PaperProvider><WelcomeScreen /></PaperProvider>);
  await waitFor(() => expect(screen.getByTestId('welcome-image').props.autoplay).toBe(false));
  expect(screen.queryByText('Pause illustration')).toBeNull();
});
