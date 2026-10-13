export const truckFields = [
  { key: 'height_ft', label: 'Total height', unit: 'ft', max: 25 },
  { key: 'width_ft', label: 'Total width', unit: 'ft', max: 25 },
  { key: 'length_ft', label: 'Total length', unit: 'ft', max: 200 },
  { key: 'current_weight_lb', label: 'Actual loaded vehicle weight', unit: 'lb', max: 500000 },
  { key: 'gross_weight_lb', label: 'Maximum rated gross weight', unit: 'lb', max: 500000 },
  { key: 'weight_per_axle_lb', label: 'Heaviest axle weight', unit: 'lb', max: 200000 },
] as const;
export type TruckField = (typeof truckFields)[number]['key'];
export type TruckProfile = Record<TruckField, number>;
export type TruckProfileDraft = Record<TruckField, string>;
export const emptyTruckProfile = (): TruckProfileDraft => ({
  height_ft: '',
  width_ft: '',
  length_ft: '',
  current_weight_lb: '',
  gross_weight_lb: '',
  weight_per_axle_lb: '',
});
export function readTruckProfile(draft: TruckProfileDraft, cargo: number): TruckProfile {
  const result = {} as TruckProfile;
  for (const field of truckFields) {
    const value = Number(draft[field.key]);
    if (!Number.isFinite(value) || value <= 0 || value > field.max)
      throw new Error(
        `Enter ${field.label.toLowerCase()} between 0 and ${field.max} ${field.unit} (greater than zero).`,
      );
    result[field.key] = value;
  }
  if (result.current_weight_lb <= cargo)
    throw new Error(
      'Actual loaded vehicle weight must include the vehicle and exceed cargo weight.',
    );
  if (result.current_weight_lb > result.gross_weight_lb)
    throw new Error('Loaded vehicle weight cannot exceed maximum rated gross weight.');
  if (result.weight_per_axle_lb > result.current_weight_lb)
    throw new Error('Heaviest axle weight cannot exceed loaded vehicle weight.');
  return result;
}
