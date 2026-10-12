import { DispatchIntro } from '@/components/DispatchIntro';
import { presentExplanation, presentRoutes } from '@/lib/result-presentation';
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
import { useTripDraft } from '@/hooks/useTripDraft';
import type { DemoState, Risk } from '@/lib/dispatch-data';
import { rankRoutes } from '@/lib/route-ranking';

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

function Index() {
  const [state, setState] = useState<DemoState>('results');
  const [forecast, setForecast] = useState(4);
  const [opacity, setOpacity] = useState(45);
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
  const {
    mode,
    setMode,
    origin,
    setOrigin,
    destination,
    setDestination,
    originCandidate,
    setOriginCandidate,
    destinationCandidate,
    setDestinationCandidate,
    departure,
    setDeparture,
    weight,
    setWeight,
    spacing,
    setSpacing,
  } = useTripDraft(analysis);
  const originSearch = useLocationSearch(mode, origin, !originCandidate);
  const destinationSearch = useLocationSearch(mode, destination, !destinationCandidate);
  useEffect(() => {
    if (!pending) return;
    const timer = setInterval(() => setProgress((value) => (value >= 92 ? 38 : value + 7)), 650);
    return () => clearInterval(timer);
  }, [pending]);
  const routes = presentRoutes(analysis);
  const rankedRoutes = rankRoutes(routes);
  const selectedRoute = routes.find((route) => route.id === selected) ?? routes[0];
  const apiCheckpoint = selectedRoute?.checkpoints[checkpoint];
  const inspectorCheckpoint = apiCheckpoint
    ? {
        city: `Checkpoint ${checkpoint + 1}`,
        miles: apiCheckpoint.distance_from_origin_miles,
        minutes: 0,
        wind: apiCheckpoint.weather?.wind_mph ?? null,
        rain: apiCheckpoint.weather?.rain_in_hr ?? null,
        snow: apiCheckpoint.weather?.snow_in_hr ?? null,
        risk: apiCheckpoint.risk as Risk,
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
          timezone: originCandidate?.timezone ?? (mode === 'demo' ? 'America/Chicago' : ''),
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
      <main className={!analysis ? 'has-intro' : undefined}>
        {!analysis && <DispatchIntro />}
        <div className="page-heading" id="trip-planning">
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
          pending={pending}
          origin={origin}
          destination={destination}
          departure={departure}
          timezone={
            originCandidate?.timezone ?? (mode === 'demo' ? 'America/Chicago' : 'Select timezone')
          }
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
        {analysis && applied && selectedRoute && inspectorCheckpoint && (
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
                    : routes.every((route) => route.eligibility === 'blocked')
                      ? 'blocked'
                      : 'incomplete'
              }
              recommendedRouteId={analysis.recommendation.recommended_route_id}
              recommendedRouteLabel={
                routes.find((route) => route.id === analysis.recommendation.recommended_route_id)
                  ?.displayId
              }
              explanation={presentExplanation(analysis)}
              onChangeDeparture={() => departureRef.current?.focus()}
            />
            <ResultsWorkspace
              drawer={drawer}
              tab={activeTab}
              routes={rankedRoutes}
              selected={selected || selectedRoute.id}
              recommended={analysis.recommendation.recommended_route_id}
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
              state={state}
              dataSource={analysis.data_source}
              analysis={analysis}
              startAt={applied.resolvedDepartureAt}
              timezone={applied.timezone}
              loadWeight={applied.weight}
              onDrawer={() => setDrawer(!drawer)}
              onTab={(tab) => {
                setActiveTab(tab);
                setDrawer(true);
              }}
              onRoute={selectRoute}
              onCheckpoint={setCheckpoint}
              onOpacity={setOpacity}
              onForecast={setForecast}
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
              ? 'Live geography · Arrival-time risk'
              : 'Illustrative prototype · Not an operational routing service'}
          </span>
        </footer>
      </main>
    </div>
  );
}
