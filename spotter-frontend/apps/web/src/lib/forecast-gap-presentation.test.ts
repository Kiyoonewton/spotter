import { expect, test } from 'vitest';
import { presentExplanation } from './result-presentation';
import { liveMapAnalysis } from '../../tests/fixtures/live-map-analysis';

test('past missing arrivals explain the gap without inventing a recommendation', () => {
  const analysis = {
    ...liveMapAnalysis,
    snapshot: {
      token: 'a'.repeat(64),
      created_at: '2026-10-12T12:00:00Z',
      expires_at: '2026-10-19T12:00:00Z',
      policy_version: 'weather-risk-v1',
    },
    routes: liveMapAnalysis.routes.map((route) => ({
      ...route,
      eligibility: 'incomplete',
      checkpoints: route.checkpoints.map((point) => ({ ...point, weather: null })),
    })),
    recommendation: { ...liveMapAnalysis.recommendation, recommended_route_id: null },
  };
  const before = JSON.stringify(analysis);
  expect(presentExplanation(analysis)).toContain('outside the current forecast coverage');
  expect(JSON.stringify(analysis)).toBe(before);
  const future = {
    ...analysis,
    routes: analysis.routes.map((route) => ({
      ...route,
      checkpoints: route.checkpoints.map((point) => ({
        ...point,
        arrival_at: '2026-10-13T12:00:00Z',
      })),
    })),
  };
  expect(presentExplanation(future)).toBe(analysis.recommendation.explanation);
});
