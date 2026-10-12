import { timingDescription } from '@/lib/timing-presentation';
import type { TripAnalysis } from '@/services/api';
import { formatMeasurement, presentRoutes, presentExplanation } from '@/lib/result-presentation';

type Props = { analysis: TripAnalysis; selected: string };
export function DriverBriefing({ analysis, selected }: Props) {
  const input = analysis.applied_request;
  const route = presentRoutes(analysis).find((candidate) => candidate.id === selected);
  if (!route || !input) return <p>Trip metadata is unavailable for this briefing.</p>;
  const date = (value: string) =>
    new Intl.DateTimeFormat('en-US', {
      dateStyle: 'medium',
      timeStyle: 'short',
      timeZone: input.departure_timezone,
    }).format(new Date(value));
  const weather = (value: number | null | undefined, unit: string) =>
    value == null
      ? 'Unavailable'
      : `${unit === 'mph' ? formatMeasurement(value) : value.toFixed(2)} ${unit}`;
  return (
    <article id="driver-briefing">
      <h1>Waycast driver briefing</h1>
      <h2>
        {input.origin} → {input.destination}
      </h2>
      <p>
        {analysis.data_source === 'demo'
          ? 'Illustrative demo data'
          : 'Provider-backed arrival-time analysis'}{' '}
        · {input.departure_timezone}
      </p>
      <p>
        Departure: {date(input.departure_at)} · Cargo: {formatMeasurement(input.load_weight_lb)} lb
        · Sampling: {input.checkpoint_spacing_miles} mi
      </p>
      <h3>
        Inspected Route {route.displayId ?? route.id} · {route.eligibility}
      </h3>
      <p>
        {formatMeasurement(route.miles)} miles · {formatMeasurement(route.minutes)} driving minutes.
        {timingDescription(analysis.routes.find((candidate) => candidate.id === selected))}
      </p>
      {analysis.recommendation.recommended_route_id === route.id ? (
        <p>Recommended by this analysis.</p>
      ) : (
        <p>
          This inspected route is not recommended by the analysis. Inspection is not approval to
          travel.
        </p>
      )}
      <p>{presentExplanation(analysis)}</p>
      <p>
        Severe: {formatMeasurement(route.severe)} mi · High: {formatMeasurement(route.high)} mi ·
        Unknown: {formatMeasurement(route.risk_miles['Unknown'] ?? 0)} mi · No Travel:{' '}
        {formatMeasurement(route.risk_miles['No Travel'] ?? 0)} mi
      </p>
      {analysis.snapshot && (
        <p>
          Recorded {date(analysis.snapshot.created_at)} · Policy {analysis.snapshot.policy_version}{' '}
          · Link expires {date(analysis.snapshot.expires_at)}
        </p>
      )}
      <h3>Checkpoint arrival itinerary</h3>
      <table>
        <thead>
          <tr>
            <th>Mile</th>
            <th>Arrival ({input.departure_timezone})</th>
            <th>Risk</th>
            <th>Weather and reasons</th>
          </tr>
        </thead>
        <tbody>
          {route.checkpoints
            .filter((point) => point.route_id === route.id)
            .map((point) => (
              <tr key={point.id}>
                <td>{formatMeasurement(point.distance_from_origin_miles)}</td>
                <td>{date(point.arrival_at)}</td>
                <td>{point.risk}</td>
                <td>
                  Wind: {weather(point.weather?.wind_mph, 'mph')}; rain:{' '}
                  {weather(point.weather?.rain_in_hr, 'in/hr')}; snow:{' '}
                  {weather(point.weather?.snow_in_hr, 'in/hr')}.
                  {point.reasons.map((reason, index) => (
                    <p key={index}>{reason.explanation}</p>
                  ))}
                  {point.weather?.retrieved_at && (
                    <p>
                      {point.weather.provider ?? 'Weather provider'} · retrieved{' '}
                      {date(point.weather.retrieved_at)}
                    </p>
                  )}
                  {point.weather?.forecast_valid_at && (
                    <p>Forecast sample: {date(point.weather.forecast_valid_at)}</p>
                  )}
                  {point.weather?.interval_start && point.weather?.interval_end && (
                    <p>
                      Precipitation interval: [{date(point.weather.interval_start)},{' '}
                      {date(point.weather.interval_end)}).
                    </p>
                  )}
                </td>
              </tr>
            ))}
        </tbody>
      </table>
      <p>
        Planning snapshot, not current weather or live GPS. Check conditions again before departure.
        Missing data is not safe weather; blocked and incomplete routes remain ineligible.
      </p>
    </article>
  );
}
