import { useRef } from 'react';
import { View } from 'react-native';
import { Text } from 'react-native-paper';
import type { TripAnalysis } from '../services/types';
import { TripDetails } from './TripDetails';
export function LoadedResults({ trip, onReady }: { trip: TripAnalysis; onReady: (y: number) => void }) {
  const revealed = useRef(false);
  return <View testID="loaded-results" onLayout={event => {
    if (revealed.current || event.nativeEvent.layout.height <= 0) return;
    revealed.current = true; onReady(event.nativeEvent.layout.y);
  }} style={{ gap: 16 }}>
    <Text variant="headlineSmall" accessibilityRole="header">Trip results</Text>
    <Text>Results for the successfully analyzed trip. Form edits apply after a new analysis succeeds.</Text>
    <TripDetails trip={trip} />
  </View>;
}
