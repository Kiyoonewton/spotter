import { View } from 'react-native';
import { Checkbox, Text, TextInput } from 'react-native-paper';
import { emptyTruckProfile, truckFields, type TruckProfileDraft } from '../services/truck-profile';
export function TruckFields({ value, disabled, onChange }: {
  value: TruckProfileDraft | null; disabled: boolean; onChange: (value: TruckProfileDraft | null) => void;
}) {
  return <View style={{ gap: 10 }}>
    <Checkbox.Item label="Supply truck measurements" status={value ? 'checked' : 'unchecked'} disabled={disabled}
      onPress={() => onChange(value ? null : emptyTruckProfile())} />
    {value ? <>
      <Text>Include the vehicle and all trailers. Loaded weight includes cargo; cargo weight above remains a separate weather input.</Text>
      {truckFields.map(field => <TextInput key={field.key} mode="outlined" keyboardType="decimal-pad"
        label={`${field.label} (${field.unit})`} accessibilityLabel={`${field.label} (${field.unit})`}
        disabled={disabled} value={value[field.key]} onChangeText={text => onChange({ ...value, [field.key]: text })} />)}
    </> : <Text>No physical truck profile supplied. Default truck routing does not establish clearance or weight suitability.</Text>}
  </View>;
}
