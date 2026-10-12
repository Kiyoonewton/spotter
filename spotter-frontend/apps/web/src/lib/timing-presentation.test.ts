import { expect, test } from 'vitest';
import { liveMapAnalysis } from '../../tests/fixtures/live-map-analysis';
import { timingDescription } from './timing-presentation';

test('timing provenance distinguishes provider spans, fallback and old snapshots', () => {
  const original = liveMapAnalysis.routes[0]!;
  expect(timingDescription({ ...original, timing_method: 'here_span_interpolation' })).toContain(
    'HERE road-span durations',
  );
  expect(
    timingDescription({ ...original, timing_method: 'distance_proportional_estimate' }),
  ).toContain('distance-proportional estimate');
  expect(timingDescription(original)).toContain('timing detail is unavailable');
  expect(timingDescription(undefined)).toContain('saved checkpoint arrival estimates');
});
