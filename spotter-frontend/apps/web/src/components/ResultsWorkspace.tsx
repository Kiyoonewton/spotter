import { DepartureComparisonPanel } from './DepartureComparisonPanel';
import { SavedTripTools } from './SavedTripTools';
import { journeyHorizon } from '@/lib/journey-horizon';
import IconButton from '@mui/material/IconButton';
import ToggleButton from '@mui/material/ToggleButton';
import ToggleButtonGroup from '@mui/material/ToggleButtonGroup';
import ExpandMoreIcon from '@mui/icons-material/ExpandMoreRounded';
import { RouteComparison } from './RouteComparison';
import { CheckpointInspector, type InspectorCheckpoint } from './CheckpointInspector';
import { MapWorkspace } from './MapWorkspace';
import { GeographicRouteMap } from './GeographicRouteMap';
import { LiveMapWorkspace } from './LiveMapWorkspace';
import type { TripAnalysis } from '@/services/api';
import type { DemoState } from '@/lib/dispatch-data';
import type { RouteView } from './RouteCard';

type Props = {
  drawer: boolean;
  tab: 'routes' | 'checkpoint';
  routes: RouteView[];
  selected: string;
  recommended: string | null;
  blocked: boolean;
  missing: boolean;
  pending: boolean;
  progress: number;
  spacing: number;
  checkpoint: number;
  inspectorCheckpoint: InspectorCheckpoint;
  checkpointTotal: number;
  departure: string;
  opacity: number;
  forecast: number;
  state: DemoState;
  dataSource?: 'demo' | 'live';
  analysis?: TripAnalysis;
  startAt?: string;
  timezone?: string;
  loadWeight?: number;
  onDrawer: () => void;
  onTab: (tab: 'routes' | 'checkpoint') => void;
  onRoute: (id: string) => void;
  onCheckpoint: (index: number) => void;
  onOpacity: (value: number) => void;
  onForecast: (value: number) => void;
};

export function ResultsWorkspace(props: Props) {
  return (
    <div className="workspace-grid">
      {props.analysis && (
        <SavedTripTools
          key={props.analysis.analysis_id}
          analysis={props.analysis}
          selected={props.selected}
        />
      )}
      {props.analysis?.snapshot && (
        <DepartureComparisonPanel key={props.analysis.analysis_id} analysis={props.analysis} />
      )}
      <aside className={`route-panel panel-tab-${props.tab} ${props.drawer ? 'drawer-open' : ''}`}>
        <IconButton
          className="drawer-handle"
          aria-label={props.drawer ? 'Collapse route drawer' : 'Expand route drawer'}
          onClick={props.onDrawer}
        >
          <span />
          <ExpandMoreIcon sx={{ fontSize: 18 }} />
        </IconButton>
        <ToggleButtonGroup
          exclusive
          fullWidth
          className="mobile-panel-tabs"
          value={props.tab}
          onChange={(_, value: 'routes' | 'checkpoint' | null) => value && props.onTab(value)}
        >
          <ToggleButton value="routes">Routes</ToggleButton>
          <ToggleButton value="checkpoint">Checkpoint {props.checkpoint + 1}</ToggleButton>
        </ToggleButtonGroup>
        <CheckpointInspector
          checkpoint={props.inspectorCheckpoint}
          route={
            props.routes.find((route) => route.id === props.selected)?.displayId ?? props.selected
          }
          index={props.checkpoint}
          total={props.checkpointTotal}
          departure={props.departure}
          onPrevious={() => props.onCheckpoint(props.checkpoint - 1)}
          onNext={() => props.onCheckpoint(props.checkpoint + 1)}
        />
        <RouteComparison
          routes={props.routes}
          selected={props.selected}
          recommended={props.recommended}
          blocked={props.blocked}
          missing={props.missing}
          loading={props.pending}
          progress={props.progress}
          spacing={props.spacing}
          onSelect={props.onRoute}
        />
      </aside>
      {props.dataSource === 'live' &&
      props.analysis &&
      !props.analysis.snapshot?.restored &&
      props.startAt &&
      props.timezone &&
      props.loadWeight !== undefined ? (
        <LiveMapWorkspace
          key={props.analysis.analysis_id}
          analysis={props.analysis}
          startAt={props.startAt}
          timezone={props.timezone}
          load={props.loadWeight}
          selected={props.selected}
          checkpoint={props.checkpoint}
          onRoute={props.onRoute}
          onCheckpoint={(index) => {
            props.onCheckpoint(index);
            props.onTab('checkpoint');
          }}
        />
      ) : props.dataSource === 'live' ? (
        <GeographicRouteMap
          key={props.analysis?.analysis_id}
          routes={props.analysis?.routes ?? []}
          selected={props.selected}
          checkpoint={props.checkpoint}
          onRoute={props.onRoute}
          onCheckpoint={(index) => {
            props.onCheckpoint(index);
            props.onTab('checkpoint');
          }}
        />
      ) : (
        <MapWorkspace
          selected={props.selected}
          checkpoint={props.checkpoint}
          pending={props.pending}
          progress={props.progress}
          opacity={props.opacity}
          forecast={props.forecast}
          horizonHours={journeyHorizon(
            props.routes.map((route) => ({ duration_minutes: route.minutes })),
          )}
          state={props.state}
          departure={props.departure}
          spacing={props.spacing}
          missing={props.missing}
          onSelect={props.onRoute}
          onCheckpoint={(index) => {
            props.onCheckpoint(index);
            props.onTab('checkpoint');
            props.onDrawer();
          }}
          onOpacity={props.onOpacity}
          onForecast={props.onForecast}
        />
      )}
    </div>
  );
}
