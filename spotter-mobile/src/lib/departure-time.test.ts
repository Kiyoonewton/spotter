import { localTimestamp } from './departure-time';
test('origin wall-clock conversion follows winter and summer offsets', () => {
  expect(localTimestamp('2027-01-10T10:00', 'America/Chicago')).toBe('2027-01-10T16:00:00.000Z');
  expect(localTimestamp('2027-07-10T10:00', 'America/Chicago')).toBe('2027-07-10T15:00:00.000Z');
});
