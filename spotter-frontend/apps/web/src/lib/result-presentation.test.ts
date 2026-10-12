import { describe, expect, it } from 'vitest';
import { liveMapAnalysis } from '../../tests/fixtures/live-map-analysis';
import { formatMeasurement, presentExplanation, presentRoutes } from './result-presentation';
import { rankRoutes } from './route-ranking';

describe('result presentation', () => {
  it('keeps labels tied to response order after ranking and preserves API ownership', () => {
    const before = JSON.stringify(liveMapAnalysis);
    const routes = presentRoutes(liveMapAnalysis);
    const ranked = rankRoutes(routes);
    expect(ranked[0]?.id).toBe('here-safe');
    expect(ranked[0]?.displayId).toBe('B');
    expect(ranked[1]?.displayId).toBe('A');
    expect(routes[0]?.checkpoints[0]?.route_id).toBe('here-fast');
    expect(JSON.stringify(liveMapAnalysis)).toBe(before);
  });
  it('preserves demo labels and null recommendation explanations', () => {
    const demo = { ...liveMapAnalysis, data_source: 'demo' as const };
    expect(presentRoutes(demo)[0]?.displayId).toBe('here-fast');
    const unavailable = {
      ...demo,
      recommendation: {
        status: 'unavailable',
        recommended_route_id: null,
        explanation: 'Incomplete forecast.',
      },
    };
    expect(presentExplanation(unavailable)).toBe('Incomplete forecast.');
  });
  it('replaces opaque IDs in explanations without changing the recommendation', () => {
    const id = '742c905d-927c-405b-833d-87150c3268e7';
    const analysis = {
      ...liveMapAnalysis,
      routes: [{ ...liveMapAnalysis.routes[0]!, id }],
      recommendation: {
        status: 'recommended',
        recommended_route_id: id,
        explanation: `${id} has the best eligible risk ranking.`,
      },
    };
    expect(presentExplanation(analysis)).toBe('Route A has the best eligible risk ranking.');
    expect(analysis.recommendation.recommended_route_id).toBe(id);
  });
  it('rounds display measurements while retaining zero and grouping miles', () => {
    expect(formatMeasurement(487.824231)).toBe('487.8');
    expect(formatMeasurement(8.077825496)).toBe('8.1');
    expect(formatMeasurement(0)).toBe('0');
    expect(formatMeasurement(1234.56)).toBe('1,234.6');
  });
});
