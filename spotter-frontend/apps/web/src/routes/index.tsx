import { createFileRoute } from '@tanstack/react-router';
import { useEffect, useRef, useState } from 'react';
import IconButton from '@mui/material/IconButton';
import Slider from '@mui/material/Slider';
import Chip from '@mui/material/Chip';
import Card from '@mui/material/Card';
import CardActionArea from '@mui/material/CardActionArea';
import ToggleButton from '@mui/material/ToggleButton';
import ToggleButtonGroup from '@mui/material/ToggleButtonGroup';
import LinearProgress from '@mui/material/LinearProgress';
import Avatar from '@mui/material/Avatar';
import Tooltip from '@mui/material/Tooltip';
import ArrowUpRightIcon from '@mui/icons-material/NorthEastRounded';
import CheckIcon from '@mui/icons-material/CheckRounded';
import ExpandMoreIcon from '@mui/icons-material/ExpandMoreRounded';
import ChevronLeftIcon from '@mui/icons-material/ChevronLeftRounded';
import ChevronRightIcon from '@mui/icons-material/ChevronRightRounded';
import CloudIcon from '@mui/icons-material/FilterDramaOutlined';
import ClockIcon from '@mui/icons-material/AccessTimeRounded';
import ScienceIcon from '@mui/icons-material/ScienceOutlined';
import InfoIcon from '@mui/icons-material/InfoOutlined';
import LayersIcon from '@mui/icons-material/LayersOutlined';
import PlaceIcon from '@mui/icons-material/PlaceOutlined';
import NavigationIcon from '@mui/icons-material/NavigationRounded';
import PlayIcon from '@mui/icons-material/PlayArrowRounded';
import PauseIcon from '@mui/icons-material/PauseRounded';
import ShieldIcon from '@mui/icons-material/GppGoodOutlined';
import SnowIcon from '@mui/icons-material/AcUnitRounded';
import WindIcon from '@mui/icons-material/AirRounded';
import RainIcon from '@mui/icons-material/WaterDropOutlined';
import WarningIcon from '@mui/icons-material/WarningAmberRounded';
import { TripForm } from '@/components/TripForm';
import { RouteComparison } from '@/components/RouteComparison';
import { CheckpointInspector } from '@/components/CheckpointInspector';
import { ForecastTimeline } from '@/components/ForecastTimeline';
import { RecommendationBanner } from '@/components/RecommendationBanner';
import { DemoStateSwitcher } from '@/components/DemoStateSwitcher';
import { MapWorkspace } from '@/components/MapWorkspace';
import { ResultsWorkspace } from '@/components/ResultsWorkspace';
import { WorkspaceHeader } from '@/components/WorkspaceHeader';
import TextField from '@mui/material/TextField';
import MenuItem from '@mui/material/MenuItem';
import Button from '@mui/material/Button';
import ArrowRightIcon from '@mui/icons-material/ArrowForwardRounded';
import RouteIcon from '@mui/icons-material/RouteOutlined';
import { DispatchMap } from '@/components/dispatch-map';
import { RiskMileageBar } from '@/components/risk-mileage-bar';
import { useTripAnalysis } from '@/hooks/useTripAnalysis';
import {
  checkpoints,
  rankRoutes,
  tripTime,
  type DemoState,
  type RouteId,
  type Risk,
} from '@/lib/dispatch-data';

export const Route = createFileRoute('/')({
  head: () => ({
    meta: [
      { title: 'Waycast — Weather-aware dispatch' },
      {
        name: 'description',
        content:
          'Compare illustrative truck routes, inspect arrival-time weather, and explore corridor forecasts in the Waycast dispatch workspace.',
      },
      { property: 'og:title', content: 'Waycast — Weather-aware dispatch' },
      {
        property: 'og:description',
        content:
          'A weather-aware truck routing workspace with route comparisons and arrival-time checkpoints.',
      },
      { property: 'og:type', content: 'website' },
      { name: 'twitter:card', content: 'summary_large_image' },
    ],
  }),
  component: Index,
});
const stateOptions: { id: DemoState; label: string }[] = [
  { id: 'results', label: 'Desktop results' },
  { id: 'mobile', label: 'Mobile preview' },
  { id: 'loading', label: 'Calculating' },
  { id: 'missing', label: 'Missing forecast' },
  { id: 'blocked', label: 'All routes blocked' },
];
const sx = (n: number) => ({ fontSize: n });
const riskLevels: Risk[] = ['Low', 'Moderate', 'High', 'Severe', 'No Travel'];
function RiskDot({ risk }: { risk: Risk }) {
  return <span className={`risk-dot risk-${risk.toLowerCase().replace(' ', '-')}`} />;
}

function Index() {
  const [state, setState] = useState<DemoState>('results');
  const [origin, setOrigin] = useState('Chicago, IL');
  const [destination, setDestination] = useState('Pittsburgh, PA');
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
    submit,
    selectRoute,
    setCheckpointIndex: setCheckpoint,
  } = useTripAnalysis();
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
  const apiRoutes = analysis?.routes.map((route) => ({
    ...route,
    miles: route.distance_miles,
    minutes: route.duration_minutes,
    severe: route.risk_miles['Severe'] ?? 0,
    high: route.risk_miles['High'] ?? 0,
    average: route.average_risk ?? 0,
    roads: 'Illustrative corridor geometry',
  }));
  const ranking = apiRoutes?.length ? apiRoutes : rankRoutes(applied.weight);
  const recommended = ranking[0];
  const selectedApiRoute = apiRoutes?.find((route) => route.id === selected);
  const apiCheckpoint = selectedApiRoute?.checkpoints[checkpoint];
  const cp = apiCheckpoint
    ? {
        city: `Checkpoint ${checkpoint + 1}`,
        miles: apiCheckpoint.distance_from_origin_miles,
        minutes: 0,
        wind: apiCheckpoint.weather.wind_mph ?? 0,
        rain: apiCheckpoint.weather.rain_in_hr ?? 0,
        snow: apiCheckpoint.weather.snow_in_hr ?? 0,
        risk: apiCheckpoint.risk as Risk,
        rule: apiCheckpoint.reasons.map((reason) => reason.explanation).join(' '),
      }
    : (checkpoints[checkpoint] ?? checkpoints[2]);
  if (!recommended || !cp) return null;
  const missing = state === 'missing';
  const blocked = state === 'blocked';
  const cpRisk: Risk = apiCheckpoint
    ? (apiCheckpoint.risk as Risk)
    : blocked
      ? 'No Travel'
      : missing && checkpoint === 3
        ? 'Unknown'
        : selected === 'A' && checkpoint === 2
          ? 'Severe'
          : selected === 'C' && checkpoint === 2
            ? 'High'
            : cp.risk;
  async function calculate(e: React.FormEvent) {
    setState('loading');
    setProgress(12);
    try {
      await submit({ origin, destination, departure, weight, spacing }, e);
    } finally {
      setState('results');
    }
  }
  return (
    <div className={`dispatch-app ${state === 'mobile' ? 'mobile-preview' : ''}`}>
      <DemoStateSwitcher
        state={state}
        onChange={(nextState) => {
          setState(nextState);
          setPlaying(false);
        }}
      />
      <WorkspaceHeader />
      <main>
        <div className="page-heading">
          <div>
            <div className="eyebrow">DISPATCH PLANNING</div>
            <h1>Weather-aware routing</h1>
            <p>Chicago to Pittsburgh · Illustrative trip comparison</p>
          </div>
          <span className="data-note">
            <InfoIcon sx={sx(15)} />
            Illustrative forecast · Oct 10, 2026
          </span>
        </div>
        <TripForm
          origin={origin}
          destination={destination}
          departure={departure}
          weight={weight}
          spacing={spacing}
          departureRef={departureRef}
          error={error}
          onOrigin={setOrigin}
          onDestination={setDestination}
          onDeparture={setDeparture}
          onWeight={setWeight}
          onSpacing={setSpacing}
          onSubmit={calculate}
        />
        {error && (
          <div role="alert" className="form-error">
            {error}
          </div>
        )}
        <div className="results-heading">
          <div>
            <h2>
              {applied.origin}
              <ArrowRightIcon sx={sx(18)} />
              {applied.destination}
            </h2>
            <span>
              3 corridors analyzed<span className="middot">·</span>
              {applied.weight.toLocaleString()} lbs<span className="middot">·</span>Checkpoints
              every {applied.spacing} mi
            </span>
          </div>
          <Chip
            className="arrival-pill-mui"
            variant="outlined"
            icon={<ClockIcon sx={sx(16)} />}
            label="Arrival-time weather"
          />
        </div>
        <RecommendationBanner
          status={
            pending
              ? 'loading'
              : blocked
                ? 'blocked'
                : missing
                  ? 'incomplete'
                  : error
                    ? 'error'
                    : 'recommended'
          }
          recommendedRouteId={recommended.id}
          explanation={
            analysis?.recommendation.explanation ??
            'Recommendation is based on the returned analysis.'
          }
          onChangeDeparture={() => {
            departureRef.current?.focus();
            departureRef.current?.scrollIntoView({ behavior: 'smooth', block: 'center' });
          }}
        />
        <ResultsWorkspace
          drawer={drawer}
          tab={activeTab}
          routes={ranking}
          selected={selected}
          recommended={recommended.id}
          blocked={blocked}
          missing={missing}
          pending={pending}
          progress={progress}
          spacing={applied.spacing}
          checkpoint={checkpoint}
          inspectorCheckpoint={cp}
          checkpointTotal={selectedApiRoute?.checkpoints.length ?? checkpoints.length}
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
        <footer className="workspace-footer">
          <span>
            <ShieldIcon sx={sx(15)} />
            Weather informs the plan. The driver makes the call.
          </span>
          <span>Illustrative prototype · Not an operational routing service</span>
        </footer>
      </main>
    </div>
  );
}
