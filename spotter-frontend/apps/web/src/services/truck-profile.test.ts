import { expect, test } from 'vitest';
import { emptyTruckProfile, readTruckProfile } from './truck-profile';
export const profileDraft = {
  height_ft: '13.5',
  width_ft: '8.5',
  length_ft: '70',
  current_weight_lb: '70000',
  gross_weight_lb: '80000',
  weight_per_axle_lb: '17000',
};
test('explicit profile parses all measurements without turning cargo into gross weight', () => {
  expect(readTruckProfile(profileDraft, 42000)).toEqual({
    height_ft: 13.5,
    width_ft: 8.5,
    length_ft: 70,
    current_weight_lb: 70000,
    gross_weight_lb: 80000,
    weight_per_axle_lb: 17000,
  });
});
test('invalid, incomplete and inconsistent profile measurements cannot submit', () => {
  expect(() => readTruckProfile(emptyTruckProfile(), 42000)).toThrow();
  for (const value of ['NaN', 'Infinity', '-1', '0', '26'])
    expect(() => readTruckProfile({ ...profileDraft, height_ft: value }, 42000)).toThrow();
  expect(() => readTruckProfile({ ...profileDraft, current_weight_lb: '40000' }, 42000)).toThrow(
    /exceed cargo/,
  );
  expect(() => readTruckProfile({ ...profileDraft, current_weight_lb: '90000' }, 42000)).toThrow(
    /rated gross/,
  );
  expect(() => readTruckProfile({ ...profileDraft, weight_per_axle_lb: '90000' }, 42000)).toThrow(
    /axle/,
  );
});
