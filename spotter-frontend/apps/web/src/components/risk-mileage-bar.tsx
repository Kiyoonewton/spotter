import type { Risk } from '@/lib/dispatch-data';

type Props = {
  miles: number;
  high: number;
  severe: number;
  route: string;
  blocked: boolean;
  missing: boolean;
};
export function RiskMileageBar({ miles, high, severe, route, blocked, missing }: Props) {
  // Low/Moderate splits are visual illustrative detail, never ranking inputs.
  const moderate = route === 'A' ? 92 : route === 'B' ? 108 : 74;
  const portions: { risk: Risk; miles: number }[] = blocked
    ? [{ risk: 'No Travel', miles }]
    : missing
      ? [{ risk: 'Unknown', miles }]
      : [
          { risk: 'Low', miles: Math.max(0, miles - moderate - high - severe) },
          { risk: 'Moderate', miles: moderate },
          { risk: 'High', miles: high },
          { risk: 'Severe', miles: severe },
        ];
  let start = 0;
  return (
    <div className="risk-mileage">
      <svg
        viewBox="0 0 1000 28"
        preserveAspectRatio="none"
        className="risk-mileage-bar"
        role="img"
        aria-label={`Route ${route} illustrative mileage: ${portions.map((p) => `${p.miles} ${p.risk} miles`).join(', ')}`}
      >
        <title>Illustrative weather exposure by mileage</title>
        {portions.map((p) => {
          const x = start;
          const width = (p.miles / miles) * 1000;
          start += width;
          return (
            <rect
              key={p.risk}
              x={x}
              y="0"
              width={width}
              height="28"
              className={`mileage-segment risk-${p.risk.toLowerCase().replace(' ', '-')}`}
            />
          );
        })}
      </svg>
      <div className="mileage-caption">
        <span>Weather exposure</span>
        <span>
          {blocked
            ? 'No Travel'
            : missing
              ? 'Risk unknown'
              : `${miles.toLocaleString()} mi · illustrative`}
        </span>
      </div>
    </div>
  );
}
