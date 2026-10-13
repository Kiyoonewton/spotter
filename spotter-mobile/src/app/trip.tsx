import { useState } from 'react';
import { KeyboardAvoidingView, Platform, ScrollView, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Button, Card, Text, TextInput } from 'react-native-paper';
import { StatusBar } from 'expo-status-bar';
import { TripDetails } from '../components/TripDetails';
import { useSavedTrip } from '../hooks/useSavedTrip';
export default function DriverScreen() {
  const [input, setInput] = useState('');
  const { trip, pending, error, open, clear } = useSavedTrip();
  return <SafeAreaView style={{ flex: 1, backgroundColor: '#F5F4EE' }}>
    <StatusBar style="dark" />
    <KeyboardAvoidingView style={{ flex: 1 }} behavior={Platform.OS === 'ios' ? 'padding' : undefined}>
      <ScrollView keyboardShouldPersistTaps="handled" contentContainerStyle={{ padding: 20, gap: 20 }}>
        <View style={{ gap: 6 }}><Text variant="headlineLarge" accessibilityRole="header">Waycast Driver</Text>
          <Text variant="bodyLarge">Your trip. Its weather. One clear briefing.</Text></View>
        <Card><Card.Content style={{ gap: 12 }}>
          <Text variant="titleLarge">Open a saved trip</Text>
          <Text>Plan on spotter.kiyoo.online, save the analysis, then paste its share link here.</Text>
          <TextInput mode="outlined" label="Saved-trip link" value={input} editable={!pending}
            onChangeText={setInput} autoCapitalize="none" autoCorrect={false} keyboardType="url"
            multiline accessibilityLabel="Saved-trip link" />
          <Text>Anyone with the link can view the saved trip. It stays in memory only in this app.</Text>
          {error !== '' && <Text accessibilityRole="alert" accessibilityLiveRegion="polite">{error}</Text>}
          <Button mode="contained" loading={pending} disabled={pending || !input.trim()}
            onPress={() => { void open(input).then(() => setInput('')); }}>Open trip</Button>
          <Button onPress={() => { clear(); setInput(''); }}>Clear trip and link</Button>
        </Card.Content></Card>
        {trip && <TripDetails key={trip.analysis_id} trip={trip} />}
      </ScrollView>
    </KeyboardAvoidingView>
  </SafeAreaView>;
}
