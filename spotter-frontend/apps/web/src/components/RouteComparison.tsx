import LinearProgress from '@mui/material/LinearProgress';
import InfoIcon from '@mui/icons-material/InfoOutlined';
import { RouteCard, type RouteView } from './RouteCard';
import type { RouteId } from '@/lib/dispatch-data';
type Props = {
  routes: RouteView[];
  selected: RouteId;
  recommended: RouteId;
  blocked: boolean;
  missing: boolean;
  loading: boolean;
  progress: number;
  spacing: number;
  onSelect: (id: RouteId) => void;
};
export function RouteComparison({
  routes,
  selected,
  recommended,
  blocked,
  missing,
  loading,
  progress,
  spacing,
  onSelect,
}: Props) {
  return (
    <div className="route-content">
      <div className="panel-heading">
        <h3>Route comparison</h3>
        <span>{loading ? 'Calculating' : 'Ranked by risk'}</span>
      </div>
      {loading ? (
        <div className="loading-routes">
          <span>Comparing weather at arrival</span>
          <LinearProgress variant="determinate" value={progress} />
        </div>
      ) : (
        routes.map((route, index) => (
          <RouteCard
            key={route.id}
            route={route}
            rank={index}
            selected={selected}
            recommended={recommended}
            blocked={blocked}
            missing={missing}
            spacing={spacing}
            onSelect={onSelect}
          />
        ))
      )}
      <div className="ranking-note">
        <InfoIcon />
        <span>Ranked by Severe miles, High miles, average risk, then travel time.</span>
      </div>
    </div>
  );
}
