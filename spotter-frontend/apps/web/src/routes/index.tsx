import { createFileRoute } from '@tanstack/react-router';
import { useEffect, useRef, useState } from 'react';
import Chip from '@mui/material/Chip';
import ToggleButton from '@mui/material/ToggleButton';
import ToggleButtonGroup from '@mui/material/ToggleButtonGroup';
import ArrowRightIcon from '@mui/icons-material/ArrowForwardRounded';
import ClockIcon from '@mui/icons-material/AccessTimeRounded';
import InfoIcon from '@mui/icons-material/InfoOutlined';
import ShieldIcon from '@mui/icons-material/GppGoodOutlined';
import { TripForm } from '@/components/TripForm';
import { DemoStateSwitcher } from '@/components/DemoStateSwitcher';
import { ResultsWorkspace } from '@/components/ResultsWorkspace';
import { RecommendationBanner } from '@/components/RecommendationBanner';
import { WorkspaceHeader } from '@/components/WorkspaceHeader';
import { useLocationSearch } from '@/hooks/useLocationSearch';
import { useTripAnalysis, type AnalysisMode } from '@/hooks/useTripAnalysis';
import type { LocationCandidate } from '@/services/api';
import type { DemoState } from '@/lib/dispatch-data';

export const Route = createFileRoute('/')({
  head: () => ({
    meta: [
      { title: 'Waycast — Weather-aware dispatch' },
      { name: 'description', content: 'Weather-aware truck routing workspace.' },
    ],
  }),
  component: Index,
});
const sx = (fontSize: number) => ({ fontSize });
const demoOrigin: LocationCandidate = {
  provider_id: 'demo:chicago',
  label: 'Chicago, IL',
  latitude: 41.8781,
  longitude: -87.6298,
  timezone: 'America/Chicago',
};
const demoDestination: LocationCandidate = {
  provider_id: 'demo:pittsburgh',
  label: 'Pittsburgh, PA',
  latitude: 40.4406,
  longitude: -79.9959,
  timezone: 'America/New_York',
};

function Index() {
  const [state, setState] = useState<DemoState>('results');
  const [mode, setMode] = useState<AnalysisMode>('demo');
  const [origin, setOrigin] = useState(demoOrigin.label);
  const [destination, setDestination] = useState(demoDestination.label);
  const [originCandidate, setOriginCandidate] = useState<LocationCandidate | null>(demoOrigin);
  const [destinationCandidate, setDestinationCandidate] = useState<LocationCandidate | null>(
    demoDestination,
  );
  const [departure, setDeparture] = useState('2026-10-10T10:00');
  const [weight, setWeight] = useState('42000');
  const [spacing, setSpacing] = useState('25');
  const [forecast, setForecast] = useState(4);
  const [opacity, setOpacity] = useState(45);
  const [playing, setPlaying] = useState(false);
  const [drawer, setDrawer] = useState(true);
  const [progress, setProgress] = useState(38);
  const [activeTab, setActiveTab] = useState<'routes' | 'checkpoint'>('routes');
  const departureRef = useRef<HTMLInputElement>(null);
  const {
    analysis,
    applied,
    selectedRouteId: selected,
    checkpointIndex: checkpoint,
    pending,
    error,
    requestId,
    submit,
    selectRoute,
    setCheckpointIndex: setCheckpoint,
    reset,
  } = useTripAnalysis();
  const originSearch = useLocationSearch(mode, origin);
  const destinationSearch = useLocationSearch(mode, destination);
  useEffect(() => {
    if (!playing) return;
    const timer = setInterval(() => setForecast((value) => (value >= 48 ? 0 : value + 1)), 900);
    return () => clearInterval(timer);
  }, [playing]);
  useEffect(() => {
    if (!pending) return;
    const timer = setInterval(() => setProgress((value) => (value >= 92 ? 38 : value + 7)), 650);
    return () => clearInterval(timer);
  }, [pending]);
  const routes =
    analysis?.routes.map((route) => ({
      ...route,
      miles: route.distance_miles,
      minutes: route.duration_minutes,
      severe: route.risk_miles.Severe ?? 0,
      high: route.risk_miles.High ?? 0,
      average: route.average_risk ?? 0,
      roads: route.name,
    })) ?? [];
  const recommended =
    routes.find((route) => route.id === analysis?.recommendation.recommended_route_id) ?? routes[0];
  const selectedRoute = routes.find((route) => route.id === selected) ?? recommended;
  const apiCheckpoint = selectedRoute?.checkpoints[checkpoint];
  const inspectorCheckpoint = apiCheckpoint
    ? {
        city: `Checkpoint ${checkpoint + 1}`,
        miles: apiCheckpoint.distance_from_origin_miles,
        minutes: 0,
        wind: apiCheckpoint.weather?.wind_mph ?? null,
        rain: apiCheckpoint.weather?.rain_in_hr ?? null,
        snow: apiCheckpoint.weather?.snow_in_hr ?? null,
        risk: apiCheckpoint.risk as any,
        rule: apiCheckpoint.reasons.map((reason) => reason.explanation).join(' '),
        arrivalAt: apiCheckpoint.arrival_at,
      }
    : null;
  const calculate = async (event: React.FormEvent) => {
    setState('loading');
    setProgress(12);
    try {
      await submit(
        {
          mode,
          origin,
          destination,
          originCandidate,
          destinationCandidate,
          departure,
          timezone: originCandidate?.timezone ?? 'America/Chicago',
          weight,
          spacing,
        },
        event,
      );
    } finally {
      setState('results');
    }
  };
  const changeMode = (next: AnalysisMode) => {
    if (next === mode) return;
    setMode(next);
    setOrigin('');
    setDestination('');
    setOriginCandidate(null);
    setDestinationCandidate(null);
    setState('results');
    reset();
  };
  return (
    <div className={`dispatch-app ${state === 'mobile' ? 'mobile-preview' : ''}`}>
      <WorkspaceHeader />
      <main>
        <div className="page-heading">
          <div>
            <div className="eyebrow">DISPATCH PLANNING</div>
            <h1>Weather-aware routing</h1>
            <p>{mode === 'live' ? 'Live provider analysis' : 'Deterministic demo analysis'}</p>
          </div>
          <span className="data-note">
            <InfoIcon sx={sx(15)} />
            {mode === 'live' ? 'Live API data' : 'Illustrative demo data'}
          </span>
        </div>
        <ToggleButtonGroup
          exclusive
          value={mode}
          onChange={(_, value: AnalysisMode | null) => value && changeMode(value)}
          aria-label="Analysis mode"
        >
          <ToggleButton value="demo">Demo</ToggleButton>
          <ToggleButton value="live">Live</ToggleButton>
        </ToggleButtonGroup>
        <TripForm
          mode={mode}
          origin={origin}
          destination={destination}
          departure={departure}
          weight={weight}
          spacing={spacing}
          departureRef={departureRef}
          error={error}
          originCandidate={originCandidate}
          destinationCandidate={destinationCandidate}
          originOptions={originSearch.options}
          destinationOptions={destinationSearch.options}
          originLoading={originSearch.loading}
          destinationLoading={destinationSearch.loading}
          locationError={originSearch.error || destinationSearch.error}
          onOrigin={(value) => {
            setOrigin(value);
            if (value !== originCandidate?.label) setOriginCandidate(null);
          }}
          onDestination={(value) => {
            setDestination(value);
            if (value !== destinationCandidate?.label) setDestinationCandidate(null);
          }}
          onOriginCandidate={setOriginCandidate}
          onDestinationCandidate={setDestinationCandidate}
          onDeparture={setDeparture}
          onWeight={setWeight}
          onSpacing={setSpacing}
          onSubmit={calculate}
        />
        {error && (
          <div role="alert" className="form-error">
            {error}
            {requestId ? ` (Request ${requestId})` : ''}
          </div>
        )}
        {analysis && applied && recommended && selectedRoute && inspectorCheckpoint && (
          <>
            <div className="results-heading">
              <div>
                <h2>
                  {applied.origin}
                  <ArrowRightIcon sx={sx(18)} />
                  {applied.destination}
                </h2>
                <span>
                  {analysis.available_route_count ?? routes.length} corridors analyzed ·{' '}
                  {applied.weight.toLocaleString()} lbs · Checkpoints every {applied.spacing} mi
                </span>
              </div>
              <Chip
                className="arrival-pill-mui"
                variant="outlined"
                icon={<ClockIcon sx={sx(16)} />}
                label={`${analysis.data_source === 'live' ? 'Live' : 'Demo'} arrival-time weather`}
              />
            </div>
            <RecommendationBanner
              status={
                pending
                  ? 'loading'
                  : analysis.recommendation.recommended_route_id
                    ? 'recommended'
                    : 'incomplete'
              }
              recommendedRouteId={analysis.recommendation.recommended_route_id ?? selectedRoute.id}
              explanation={analysis.recommendation.explanation}
              onChangeDeparture={() => departureRef.current?.focus()}
            />
            <ResultsWorkspace
              drawer={drawer}
              tab={activeTab}
              routes={routes}
              selected={selected || selectedRoute.id}
              recommended={analysis.recommendation.recommended_route_id ?? selectedRoute.id}
              blocked={selectedRoute.eligibility === 'blocked'}
              missing={selectedRoute.eligibility === 'incomplete'}
              pending={pending}
              progress={progress}
              spacing={applied.spacing}
              checkpoint={checkpoint}
              inspectorCheckpoint={inspectorCheckpoint}
              checkpointTotal={selectedRoute.checkpoints.length}
              departure={applied.departure}
              opacity={opacity}
              forecast={forecast}
              playing={playing}
              state={state}
              onDrawer={() => setDrawer(!drawer)}
              onTab={(tab) => {
                setActiveTab(tab);
                setDrawer(true);
              }}
              onRoute={selectRoute}
              onCheckpoint={setCheckpoint}
              onOpacity={setOpacity}
              onForecast={setForecast}
              onPlaying={setPlaying}
            />
          </>
        )}
        <footer className="workspace-footer">
          <span>
            <ShieldIcon sx={sx(15)} />
            Weather informs the plan. The driver makes the call.
          </span>
          <span>
            {mode === 'live'
              ? 'Geographic map unavailable for live routes'
              : 'Illustrative prototype · Not an operational routing service'}
          </span>
        </footer>
      </main>
    </div>
  );
}
