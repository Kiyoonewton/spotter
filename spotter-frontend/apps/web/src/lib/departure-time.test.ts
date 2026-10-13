import { expect, test } from 'vitest';
import { localTimestamp, upcomingDeparture, departureIsPast } from './departure-time';

test('upcoming default uses the origin timezone and current date, including day rollover', () => {
  const now = Date.parse('2026-10-12T23:30:00Z');
  const chicago = upcomingDeparture('America/Chicago', now);
  const tokyo = upcomingDeparture('Asia/Tokyo', now);
  expect(chicago).toBe('2026-10-12T19:00');
  expect(tokyo).toBe('2026-10-13T09:00');
  expect(Date.parse(localTimestamp(chicago, 'America/Chicago'))).toBeGreaterThan(now);
  expect(Date.parse(localTimestamp(tokyo, 'Asia/Tokyo'))).toBeGreaterThan(now);
});

test('upcoming default skips the ambiguous fall-back hour', () => {
  const now = Date.parse('2026-11-01T05:30:00Z');
  expect(upcomingDeparture('America/Chicago', now)).toBe('2026-11-01T02:00');
});

test('past departure warning is timezone-aware and leaves invalid input to submission validation', () => {
  const now = Date.parse('2026-10-12T12:00:00Z');
  expect(departureIsPast('2026-10-10T10:00', 'America/Chicago', now)).toBe(true);
  expect(departureIsPast('2026-10-12T10:00', 'America/Chicago', now)).toBe(false);
  expect(departureIsPast('', 'Select timezone', now)).toBe(false);
});
