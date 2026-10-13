import { useState } from 'react';
import { View } from 'react-native';
import { ActivityIndicator, List, Text, TextInput } from 'react-native-paper';
import { useLocationSearch } from '../hooks/useLocationSearch';
import type { Location, Mode } from '../services/trip-planning';
export function LocationField({ label, mode, value, disabled, onChange }: {
  label: string; mode: Mode; value: Location | null; disabled: boolean; onChange: (value: Location | null) => void;
}) {
  const [query, setQuery] = useState(value?.label ?? '');
  const search = useLocationSearch(query, mode, !disabled && value === null);
  return <View style={{ gap: 6 }}>
    <TextInput label={label} accessibilityLabel={label} value={query} mode="outlined" disabled={disabled}
      onChangeText={text => { setQuery(text); onChange(null); }} autoCorrect={false} />
    {search.pending && <ActivityIndicator accessibilityLabel={`Searching ${label}`} />}
    {search.error !== '' && <Text accessibilityRole="alert">{search.error}</Text>}
    {!disabled && value === null && search.results.map(item => <List.Item key={item.provider_id}
      title={item.label} titleNumberOfLines={3} accessibilityLabel={`Select ${label}: ${item.label}`}
      onPress={() => { setQuery(item.label); onChange(item); }} />)}
    {value && <Text>Selected: {value.label}</Text>}
  </View>;
}
