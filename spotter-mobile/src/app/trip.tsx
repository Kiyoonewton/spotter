import { useRef, useState } from 'react';
import { AccessibilityInfo, Keyboard, KeyboardAvoidingView, Platform, ScrollView, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Button, Card, SegmentedButtons, Text, TextInput } from 'react-native-paper';
import { StatusBar } from 'expo-status-bar';
import { TripPlanner } from '../components/TripPlanner';
import { LoadedResults } from '../components/LoadedResults';
import { useReducedMotion } from '../hooks/useReducedMotion';
import { useSavedTrip } from '../hooks/useSavedTrip';
export default function DriverScreen() {
  const scroll = useRef<ScrollView>(null);
  const reducedMotion = useReducedMotion();
  const [input, setInput] = useState('');
  const [tool, setTool] = useState('plan');
  const { trip, resultVersion, pending, error, open, analyze, clear } = useSavedTrip();
  return <SafeAreaView style={{ flex: 1, backgroundColor: '#F5F4EE' }}>
    <StatusBar style="dark" />
    <KeyboardAvoidingView style={{ flex: 1 }} behavior={Platform.OS === 'ios' ? 'padding' : undefined}>
      <ScrollView ref={scroll} keyboardShouldPersistTaps="handled" contentContainerStyle={{ padding: 20, gap: 20 }}>
        <View style={{ gap: 6 }}><Text variant="headlineLarge" accessibilityRole="header">Waycast Driver</Text>
          <Text variant="bodyLarge">Your trip. Its weather. One clear briefing.</Text></View>
        <SegmentedButtons value={tool} onValueChange={value => { clear(); setInput(''); setTool(value); }}
          buttons={[{ value: 'plan', label: 'Plan trip', disabled: pending }, { value: 'restore', label: 'Saved link', disabled: pending }]} />
        {tool === 'restore' && error !== '' && <Text accessibilityRole="alert" accessibilityLiveRegion="polite">{error}</Text>}
        {tool === 'plan' ? <TripPlanner error={error} pending={pending} onSubmit={draft => { Keyboard.dismiss(); void analyze(draft); }} onReset={clear} /> : <Card><Card.Content style={{ gap: 12 }}>
          <Text variant="titleLarge">Open a saved trip</Text>
          <Text>Plan on spotter.kiyoo.online, save the analysis, then paste its share link here.</Text>
          <TextInput mode="outlined" label="Saved-trip link" value={input} editable={!pending}
            onChangeText={setInput} autoCapitalize="none" autoCorrect={false} keyboardType="url"
            multiline accessibilityLabel="Saved-trip link" />
          <Text>Anyone with the link can view the saved trip. It stays in memory only in this app.</Text>
          <Button mode="contained" loading={pending} disabled={pending || !input.trim()}
            onPress={() => { Keyboard.dismiss(); void open(input).then(() => setInput('')); }}>Open trip</Button>
        </Card.Content></Card>}
        {(pending || trip) && <Button onPress={() => { clear(); setInput(''); }}>
          {pending ? 'Cancel request' : 'Clear analysis and link'}
        </Button>}
        {trip && <LoadedResults key={resultVersion} trip={trip} onReady={y => {
          Keyboard.dismiss(); scroll.current?.scrollTo({ y: Math.max(0, y - 12), animated: !reducedMotion });
          AccessibilityInfo.announceForAccessibility('Trip results loaded');
        }} />}
      </ScrollView>
    </KeyboardAvoidingView>
  </SafeAreaView>;
}
