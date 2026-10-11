import type { Risk } from '@/lib/dispatch-data';

type Props = {
  miles: number;
  riskMiles: Partial<Record<Risk, number>>;
  route: string;
};
export function RiskMileageBar({ miles, route, riskMiles }: Props) {
  const portions: { risk: Risk; miles: number }[] = (
    ['Low', 'Moderate', 'High', 'Severe', 'No Travel', 'Unknown'] as Risk[]
  )
    .map((risk) => ({ risk, miles: riskMiles[risk] ?? 0 }))
    .filter((part) => part.miles > 0);
  let start = 0;
  return (
    <div className="risk-mileage">
      <svg
        viewBox="0 0 1000 28"
        preserveAspectRatio="none"
        className="risk-mileage-bar"
        role="img"
        aria-label={`Route ${route} risk mileage: ${portions.map((p) => `${p.miles} ${p.risk} miles`).join(', ')}`}
      >
        <title>Returned weather exposure by mileage</title>
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
        <span>{`${miles.toLocaleString()} mi route distance`}</span>
      </div>
    </div>
  );
}
