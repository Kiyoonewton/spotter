import { useRef, useState } from 'react';
import { View } from 'react-native';
import { Button, Card, SegmentedButtons, Text, TextInput } from 'react-native-paper';
import { upcomingDeparture } from '../lib/departure-time';
import type { Draft, Location, Mode } from '../services/trip-planning';
import { LocationField } from './LocationField';
import { TruckFields } from './TruckFields';
const demoOrigin: Location = { provider_id: 'demo:chicago', label: 'Chicago, IL', latitude: 41.8781, longitude: -87.6298, timezone: 'America/Chicago' };
const demoDestination: Location = { provider_id: 'demo:pittsburgh', label: 'Pittsburgh, PA', latitude: 40.4406, longitude: -79.9959, timezone: 'America/New_York' };
function defaults(mode: Mode): Draft {
  return { mode, origin: mode === 'demo' ? demoOrigin : null, destination: mode === 'demo' ? demoDestination : null,
    departure: mode === 'demo' ? upcomingDeparture('America/Chicago') : '', timezone: mode === 'demo' ? 'America/Chicago' : '',
    cargo: '42000', spacing: '25', truck: null };
}
export function TripPlanner({ pending, onSubmit, onReset }: {
  pending: boolean; onSubmit: (draft: Draft) => void; onReset: () => void;
}) {
  const [draft, setDraft] = useState(() => defaults('demo'));
  const editedTime = useRef(false);
  function changeTimezone(timezone: string, origin = draft.origin) {
    let departure = draft.departure;
    if (!editedTime.current && timezone) {
      try { departure = upcomingDeparture(timezone); } catch { /* Validate at submission. */ }
    }
    setDraft(d => ({ ...d, origin, timezone, departure }));
  }
  return <Card><Card.Content style={{ gap: 14 }}>
    <Text variant="titleLarge" accessibilityRole="header">Plan a trip</Text>
    <SegmentedButtons value={draft.mode} onValueChange={value => {
      if (pending || (value !== 'demo' && value !== 'live')) return;
      onReset(); editedTime.current = false; setDraft(defaults(value));
    }} buttons={['demo', 'live'].map(value => ({ value, label: value === 'demo' ? 'Demo' : 'Live', disabled: pending }))} />
    <Text>{draft.mode === 'demo' ? 'Deterministic Chicago → Pittsburgh demonstration.' : 'Live routing and weather require an internet connection. Select both locations.'}</Text>
    {draft.mode === 'live' && <View style={{ gap: 12 }}>
      <LocationField label="Origin" mode="live" value={draft.origin} disabled={pending} onChange={origin =>
        changeTimezone(origin?.timezone ?? '', origin)} />
      <LocationField label="Destination" mode="live" value={draft.destination} disabled={pending} onChange={destination => setDraft(d => ({ ...d, destination }))} />
    </View>}
    <TextInput label="Departure timezone (IANA)" accessibilityLabel="Departure timezone (IANA)" mode="outlined"
      value={draft.timezone} disabled={pending || !!draft.origin?.timezone || draft.mode === 'demo'}
      autoCapitalize="none" autoCorrect={false} onChangeText={timezone => changeTimezone(timezone)} />
    <TextInput label="Departure (YYYY-MM-DDTHH:mm)" accessibilityLabel="Departure (YYYY-MM-DDTHH:mm)" mode="outlined"
      value={draft.departure} disabled={pending} autoCapitalize="none" autoCorrect={false}
      onChangeText={departure => { editedTime.current = true; setDraft(d => ({ ...d, departure })); }} />
    <Text>Enter local time in {draft.timezone || 'the origin timezone'}. Ambiguous or nonexistent daylight-saving times are rejected.</Text>
    <Button disabled={pending || !draft.timezone} onPress={() => {
      try { setDraft(d => ({ ...d, departure: upcomingDeparture(d.timezone) })); editedTime.current = false; }
      catch { /* Invalid timezone is reported at submission. */ }
    }}>Use upcoming departure</Button>
    <TextInput label="Cargo weight (lb)" accessibilityLabel="Cargo weight (lb)" mode="outlined" value={draft.cargo}
      disabled={pending} keyboardType="decimal-pad" onChangeText={cargo => setDraft(d => ({ ...d, cargo }))} />
    <Text>Checkpoint spacing</Text>
    <SegmentedButtons value={draft.spacing} onValueChange={spacing => {
      if (spacing === '10' || spacing === '25' || spacing === '50') setDraft(d => ({ ...d, spacing }));
    }} buttons={['10', '25', '50'].map(value => ({ value, label: `${value} mi`, disabled: pending }))} />
    {draft.mode === 'live' && <TruckFields value={draft.truck} disabled={pending} onChange={truck => setDraft(d => ({ ...d, truck }))} />}
    <Button mode="contained" loading={pending} disabled={pending || !draft.origin || !draft.destination}
      onPress={() => onSubmit(draft)}>Analyze trip</Button>
  </Card.Content></Card>;
}
