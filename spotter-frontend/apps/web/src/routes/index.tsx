import { createFileRoute } from '@tanstack/react-router';
import { useEffect, useRef, useState } from 'react';
import Button from '@mui/material/Button';
import IconButton from '@mui/material/IconButton';
import TextField from '@mui/material/TextField';
import MenuItem from '@mui/material/MenuItem';
import InputAdornment from '@mui/material/InputAdornment';
import Slider from '@mui/material/Slider';
import Chip from '@mui/material/Chip';
import Card from '@mui/material/Card';
import CardActionArea from '@mui/material/CardActionArea';
import ToggleButton from '@mui/material/ToggleButton';
import ToggleButtonGroup from '@mui/material/ToggleButtonGroup';
import LinearProgress from '@mui/material/LinearProgress';
import Avatar from '@mui/material/Avatar';
import Tooltip from '@mui/material/Tooltip';
import ArrowRightIcon from '@mui/icons-material/ArrowForwardRounded';
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
import RouteIcon from '@mui/icons-material/RouteOutlined';
import ShieldIcon from '@mui/icons-material/GppGoodOutlined';
import SnowIcon from '@mui/icons-material/AcUnitRounded';
import ScaleIcon from '@mui/icons-material/ScaleOutlined';
import WindIcon from '@mui/icons-material/AirRounded';
import RainIcon from '@mui/icons-material/WaterDropOutlined';
import WarningIcon from '@mui/icons-material/WarningAmberRounded';
import CalendarIcon from '@mui/icons-material/EventOutlined';
import { DispatchMap } from '@/components/dispatch-map';
import { RiskMileageBar } from '@/components/risk-mileage-bar';
import { createTripAnalysis, type TripAnalysis } from '@/services/api';
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
  const [applied, setApplied] = useState({
    origin: 'Chicago, IL',
    destination: 'Pittsburgh, PA',
    departure: '2026-10-10T10:00',
    weight: 42000,
    spacing: 25,
  });
  const [selected, setSelected] = useState<RouteId>('B');
  const [checkpoint, setCheckpoint] = useState(2);
  const [forecast, setForecast] = useState(4);
  const [opacity, setOpacity] = useState(45);
  const [playing, setPlaying] = useState(false);
  const [drawer, setDrawer] = useState(true);
  const [progress, setProgress] = useState(38);
  const [error, setError] = useState('');
  const [analysis, setAnalysis] = useState<TripAnalysis | null>(null);
  const [activeTab, setActiveTab] = useState<'routes' | 'checkpoint'>('routes');
  const departureRef = useRef<HTMLInputElement>(null);
  useEffect(() => {
    if (!playing) return;
    const timer = setInterval(() => setForecast((value) => (value >= 48 ? 0 : value + 1)), 900);
    return () => clearInterval(timer);
  }, [playing]);
  useEffect(() => {
    if (state !== 'loading') return;
    const timer = setInterval(() => setProgress((value) => (value >= 92 ? 38 : value + 7)), 650);
    return () => clearInterval(timer);
  }, [state]);
  const ranking = rankRoutes(applied.weight);
  const recommended = ranking[0];
  const cp = checkpoints[checkpoint] ?? checkpoints[2];
  if (!recommended || !cp) return null;
  const missing = state === 'missing';
  const blocked = state === 'blocked';
  const cpRisk: Risk = blocked
    ? 'No Travel'
    : missing && checkpoint === 3
      ? 'Unknown'
      : selected === 'A' && checkpoint === 2
        ? 'Severe'
        : selected === 'C' && checkpoint === 2
          ? 'High'
          : cp.risk;
  async function calculate(e: React.FormEvent) {
    e.preventDefault();
    if (!origin.trim() || !destination.trim() || !departure || Number(weight) <= 0) {
      setError('Enter both locations, a departure time, and a positive load weight.');
      return;
    }
    if (
      origin.trim().toLowerCase() !== 'chicago, il' ||
      destination.trim().toLowerCase() !== 'pittsburgh, pa'
    ) {
      setError(
        'This illustrative demo supports Chicago, IL to Pittsburgh, PA only. Other locations need a live routing service.',
      );
      return;
    }
    setError('');
    setApplied({
      origin,
      destination,
      departure,
      weight: Number(weight),
      spacing: Number(spacing),
    });
    setState('loading');
    setProgress(12);
    try {
      const result = await createTripAnalysis({ origin, destination, departure_at: new Date(departure).toISOString(), departure_timezone: 'America/Chicago', load_weight_lb: Number(weight), checkpoint_spacing_miles: Number(spacing) });
      setAnalysis(result);
      setState('results');
      const best = result.recommendation.recommended_route_id as RouteId | null;
      if (best) setSelected(best);
    } catch (requestError) {
      setError(requestError instanceof Error ? requestError.message : 'Trip analysis failed.');
      setState('results');
    }
  }
  return (
    <div className={`dispatch-app ${state === 'mobile' ? 'mobile-preview' : ''}`}>
      <div className="demo-bar">
        <div className="demo-label">
          <ScienceIcon sx={sx(15)} />
          <strong>PROTOTYPE</strong>
          <span>Illustrative data only</span>
        </div>
        <ToggleButtonGroup
          exclusive
          size="small"
          className="demo-switcher"
          aria-label="Demo state"
          value={state}
          onChange={(_, v: DemoState | null) => {
            if (v) {
              setState(v);
              setPlaying(false);
            }
          }}
        >
          {stateOptions.map((option) => (
            <ToggleButton
              key={option.id}
              value={option.id}
              className={state === option.id ? 'demo-active' : ''}
            >
              {option.label}
            </ToggleButton>
          ))}
        </ToggleButtonGroup>
        <TextField
          select
          size="small"
          className="demo-select"
          slotProps={{ htmlInput: { 'aria-label': 'Demo state' } }}
          value={state}
          onChange={(e) => setState(e.target.value as DemoState)}
        >
          {stateOptions.map((option) => (
            <MenuItem key={option.id} value={option.id}>
              {option.label}
            </MenuItem>
          ))}
        </TextField>
      </div>
      <header className="app-header">
        <div className="brand">
          <span className="brand-icon">
            <NavigationIcon sx={sx(24)} />
          </span>
          <span>
            waycast<span className="brand-period">.</span>
          </span>
          <span className="workspace-tag">DISPATCH WORKSPACE</span>
        </div>
        <div className="header-right">
          <Chip
            className="header-status-mui"
            size="small"
            color="success"
            variant="outlined"
            label="Weather-aware routing"
          />
          <Avatar
            className="avatar"
            sx={{ width: 36, height: 36, bgcolor: 'primary.main', fontSize: 13 }}
          >
            IK
          </Avatar>
        </div>
      </header>
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
        <form className="trip-form" onSubmit={calculate}>
          <TextField
            className="trip-field-mui"
            label="Origin"
            value={origin}
            onChange={(e) => setOrigin(e.target.value)}
            slotProps={{
              input: {
                startAdornment: (
                  <InputAdornment position="start">
                    <PlaceIcon sx={sx(18)} />
                  </InputAdornment>
                ),
              },
            }}
          />
          <ArrowRightIcon className="trip-arrow" sx={sx(18)} />
          <TextField
            className="trip-field-mui"
            label="Destination"
            value={destination}
            onChange={(e) => setDestination(e.target.value)}
            slotProps={{
              input: {
                startAdornment: (
                  <InputAdornment position="start">
                    <PlaceIcon sx={sx(18)} />
                  </InputAdornment>
                ),
              },
            }}
          />
          <TextField
            className="trip-field-mui"
            label="Departure · CDT"
            type="datetime-local"
            value={departure}
            onChange={(e) => setDeparture(e.target.value)}
            inputRef={departureRef}
            slotProps={{
              inputLabel: { shrink: true },
              htmlInput: { 'aria-label': 'Departure date and time' },
              input: {
                startAdornment: (
                  <InputAdornment position="start">
                    <CalendarIcon sx={sx(18)} />
                  </InputAdornment>
                ),
              },
            }}
          />
          <TextField
            className="trip-field-mui"
            label="Load weight"
            type="number"
            value={weight}
            onChange={(e) => setWeight(e.target.value)}
            slotProps={{
              htmlInput: { min: 1, max: 100000, 'aria-label': 'Load weight in lbs' },
              input: {
                startAdornment: (
                  <InputAdornment position="start">
                    <ScaleIcon sx={sx(18)} />
                  </InputAdornment>
                ),
                endAdornment: <InputAdornment position="end">lbs</InputAdornment>,
              },
            }}
          />
          <TextField
            className="trip-field-mui"
            select
            label="Checkpoints"
            value={spacing}
            onChange={(e) => setSpacing(e.target.value)}
            slotProps={{
              htmlInput: { 'aria-label': 'Checkpoint spacing' },
              input: {
                startAdornment: (
                  <InputAdornment position="start">
                    <RouteIcon sx={sx(18)} />
                  </InputAdornment>
                ),
              },
            }}
          >
            <MenuItem value="10">Every 10 mi</MenuItem>
            <MenuItem value="25">Every 25 mi</MenuItem>
            <MenuItem value="50">Every 50 mi</MenuItem>
          </TextField>
          <Button
            className="calculate-button-mui"
            variant="contained"
            size="large"
            type="submit"
            startIcon={<RouteIcon />}
            endIcon={<ArrowRightIcon />}
          >
            Compare routes
          </Button>
        </form>
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
        <div
          className={`recommendation ${blocked ? 'recommendation-blocked' : missing ? 'recommendation-missing' : ''}`}
          role="status"
        >
          <span className="recommendation-icon">
            {blocked ? (
              <WarningIcon sx={sx(22)} />
            ) : missing ? (
              <InfoIcon sx={sx(22)} />
            ) : (
              <ShieldIcon sx={sx(22)} />
            )}
          </span>
          <div>
            <strong>
              {state === 'loading'
                ? 'Finding your best corridor…'
                : blocked
                  ? 'No suitable route for this departure'
                  : missing
                    ? 'Recommendation unavailable — incomplete forecast'
                    : `Route ${recommended.id} recommended`}
            </strong>
            <p>
              {state === 'loading'
                ? 'Calculating checkpoint arrival times and comparing weather exposure.'
                : blocked
                  ? 'All three corridors trigger weather-based No Travel rules. These are not verified road closures.'
                  : missing
                    ? 'Risk unknown—forecast unavailable near Mansfield. Available metrics do not establish a safe route.'
                    : recommended.id === 'B'
                      ? 'Adds 18 minutes versus Route A, but avoids 32 miles of Severe weather.'
                      : 'Avoids Severe weather and has fewer High-risk miles for the lighter illustrative load.'}
            </p>
          </div>
          {blocked ? (
            <Button
              variant="outlined"
              endIcon={<ArrowRightIcon />}
              onClick={() => {
                departureRef.current?.focus();
                departureRef.current?.scrollIntoView({ behavior: 'smooth', block: 'center' });
              }}
            >
              Change departure time
            </Button>
          ) : (
            <Chip
              sx={{ ml: 'auto' }}
              size="small"
              color={missing ? 'default' : 'success'}
              label={
                missing
                  ? 'FORECAST GAP'
                  : state === 'loading'
                    ? 'ANALYZING'
                    : 'LOWEST WEATHER EXPOSURE'
              }
            />
          )}
        </div>
        <div className="workspace-grid">
          <aside className={`route-panel ${drawer ? 'drawer-open' : ''}`}>
            <IconButton
              className="drawer-handle"
              aria-label={drawer ? 'Collapse route drawer' : 'Expand route drawer'}
              onClick={() => setDrawer(!drawer)}
            >
              <span />
              <ExpandMoreIcon sx={sx(18)} />
            </IconButton>
            <ToggleButtonGroup
              exclusive
              fullWidth
              className="mobile-panel-tabs"
              value={activeTab}
              onChange={(_, v: 'routes' | 'checkpoint' | null) => {
                if (v) {
                  setActiveTab(v);
                  setDrawer(true);
                }
              }}
            >
              <ToggleButton value="routes">Routes</ToggleButton>
              <ToggleButton value="checkpoint">Checkpoint {checkpoint + 1}</ToggleButton>
            </ToggleButtonGroup>
            <div className={`route-content ${activeTab === 'checkpoint' ? 'mobile-hide' : ''}`}>
              <div className="panel-heading">
                <h3>Route comparison</h3>
                <span>{state === 'loading' ? 'Calculating' : 'Ranked by risk'}</span>
              </div>
              {state === 'loading' ? (
                <div className="loading-routes">
                  {[1, 2, 3].map((n) => (
                    <div className="skeleton-card" key={n}>
                      <div className="skeleton-line wide" />
                      <div className="skeleton-line" />
                      <div className="skeleton-metrics" />
                    </div>
                  ))}
                  <span>Comparing weather at arrival</span>
                  <LinearProgress
                    variant="determinate"
                    value={progress}
                    sx={{ height: 8, borderRadius: 4 }}
                  />
                  <strong>{progress}% calculated</strong>
                </div>
              ) : (
                ranking.map((route, index) => (
                  <Card
                    key={route.id}
                    className={`route-card-mui ${selected === route.id ? 'selected' : ''}`}
                  >
                    <CardActionArea
                      className="route-card"
                      onClick={() => setSelected(route.id)}
                      aria-pressed={selected === route.id}
                    >
                      <div className="route-card-top">
                        <span className="route-id">{route.id}</span>
                        <div className="route-name">
                          <strong>Route {route.id}</strong>
                          <span>{route.name}</span>
                        </div>
                        {!blocked && !missing && index === 0 ? (
                          <Chip
                            size="small"
                            color="success"
                            icon={<CheckIcon sx={sx(14)} />}
                            label="Recommended"
                          />
                        ) : (
                          <Chip size="small" variant="outlined" label={`#${index + 1}`} />
                        )}
                      </div>
                      <div className="route-road">
                        {route.roads}
                        <span>{route.miles} mi</span>
                      </div>
                      <RiskMileageBar
                        route={route.id}
                        miles={route.miles}
                        high={route.high}
                        severe={route.severe}
                        blocked={blocked}
                        missing={missing}
                      />
                      <div className="route-metrics">
                        <div>
                          <span>
                            <RiskDot risk="Severe" />
                            Severe miles
                          </span>
                          <strong>
                            {blocked ? '—' : route.severe}
                            <small>{!blocked ? ' mi' : ''}</small>
                          </strong>
                        </div>
                        <div>
                          <span>
                            <RiskDot risk="High" />
                            High miles
                          </span>
                          <strong>
                            {blocked ? '—' : route.high}
                            <small>{!blocked ? ' mi' : ''}</small>
                          </strong>
                        </div>
                        <div>
                          <span>Average risk</span>
                          <strong>
                            {blocked || missing ? '—' : route.average.toFixed(1)}
                            <small>{!blocked && !missing ? ' / 5' : ''}</small>
                          </strong>
                        </div>
                        <div>
                          <span>Travel time</span>
                          <strong>
                            {Math.floor(route.minutes / 60)}h {route.minutes % 60}m
                          </strong>
                        </div>
                      </div>
                      {!blocked && !missing && route.id === 'B' && recommended.id === 'B' && (
                        <div className="route-reason">
                          <ShieldIcon sx={sx(15)} />
                          <span>+18 min · avoids 32 Severe miles</span>
                        </div>
                      )}
                      {blocked ? (
                        <div className="blocked-rule">
                          <WarningIcon sx={sx(14)} />
                          {route.id === 'A'
                            ? 'Snow > 1.5 in/hr + wind > 40 mph'
                            : route.id === 'B'
                              ? 'Wind > 50 mph at Fort Wayne'
                              : 'Snow > 2.0 in/hr near Columbus'}{' '}
                          — No Travel
                        </div>
                      ) : (
                        <div className="route-card-footer">
                          {selected === route.id ? (
                            <span>
                              <span className="selection-mark" />
                              Selected route
                            </span>
                          ) : (
                            <span>
                              Select route
                              <ArrowUpRightIcon sx={sx(13)} />
                            </span>
                          )}
                          <span>
                            {missing
                              ? 'Partial forecast'
                              : `${Math.ceil(route.miles / applied.spacing) + 1} checkpoints`}
                          </span>
                        </div>
                      )}
                    </CardActionArea>
                  </Card>
                ))
              )}
              <div className="ranking-note">
                <InfoIcon sx={sx(15)} />
                <span>Ranked by Severe miles, High miles, average risk, then travel time.</span>
              </div>
            </div>
            <div className={`checkpoint-panel ${activeTab === 'routes' ? 'mobile-hide' : ''}`}>
              <div className="panel-heading">
                <h3>Checkpoint inspector</h3>
                <div className="checkpoint-nav">
                  <IconButton
                    aria-label="Previous checkpoint"
                    disabled={checkpoint === 0}
                    onClick={() => setCheckpoint(checkpoint - 1)}
                  >
                    <ChevronLeftIcon />
                  </IconButton>
                  <IconButton
                    aria-label="Next checkpoint"
                    disabled={checkpoint === checkpoints.length - 1}
                    onClick={() => setCheckpoint(checkpoint + 1)}
                  >
                    <ChevronRightIcon />
                  </IconButton>
                </div>
              </div>
              <div className="checkpoint-place">
                <span className="checkpoint-icon">
                  <PlaceIcon sx={sx(19)} />
                </span>
                <div>
                  <strong>{cp.city}</strong>
                  <span>
                    Route {selected} · Sample checkpoint {checkpoint + 1} · Mile {cp.miles}
                  </span>
                </div>
                <Chip
                  size="small"
                  className={`risk-chip risk-${cpRisk.toLowerCase().replace(' ', '-')}`}
                  label={cpRisk}
                />
              </div>
              <div className="checkpoint-eta">
                <ClockIcon sx={sx(15)} />
                <span>Truck arrival</span>
                <strong>{tripTime(applied.departure, cp.minutes)}</strong>
              </div>
              <div className="weather-metrics">
                <div>
                  <WindIcon sx={sx(20)} />
                  <strong>
                    {cpRisk === 'Unknown' ? '—' : cpRisk === 'No Travel' ? 52 : cp.wind}
                    <small>mph</small>
                  </strong>
                  <span>Wind</span>
                </div>
                <div>
                  <RainIcon sx={sx(20)} />
                  <strong>
                    {cpRisk === 'Unknown' ? '—' : cp.rain.toFixed(2)}
                    <small>in/hr</small>
                  </strong>
                  <span>Rain</span>
                </div>
                <div>
                  <SnowIcon sx={sx(20)} />
                  <strong>
                    {cpRisk === 'Unknown' ? '—' : cpRisk === 'Severe' ? '1.2' : cp.snow.toFixed(2)}
                    <small>in/hr</small>
                  </strong>
                  <span>Snow</span>
                </div>
              </div>
              <div className={`trigger-rule ${cpRisk === 'Unknown' ? 'unknown-rule' : ''}`}>
                <span>
                  <WarningIcon sx={sx(15)} />
                  TRIGGERING RULE
                  <Chip
                    size="small"
                    color="warning"
                    label="RULE"
                    sx={{ ml: 'auto', height: 20, fontSize: 10 }}
                  />
                </span>
                <p>
                  {cpRisk === 'Unknown'
                    ? 'Risk unknown—forecast unavailable. No arrival-time weather can be assessed at this checkpoint.'
                    : cpRisk === 'No Travel'
                      ? 'Wind > 50 mph triggers weather-based No Travel. This is not a verified road closure.'
                      : cpRisk === 'Severe'
                        ? 'Snow > 1.0 in/hr + crosswind > 35 mph triggers Severe risk.'
                        : cp.rule}
                </p>
              </div>
            </div>
          </aside>
          <section className="map-workspace">
            <div className="map-header">
              <div>
                <span className="live-dot" />
                <strong>Corridor overview</strong>
                <span className="selected-map-label">Route {selected} selected</span>
              </div>
              <Chip
                size="small"
                variant="outlined"
                icon={<LayersIcon sx={sx(15)} />}
                label="Weather overlay"
              />
            </div>
            <div className="map-stage">
              {state === 'loading' ? (
                <div className="map-loading">
                  <div className="loading-orbit">
                    <RouteIcon sx={sx(30)} />
                  </div>
                  <h3>Checking the weather ahead</h3>
                  <p>
                    Sampling {Math.ceil(482 / applied.spacing) + 1} checkpoint arrival forecasts
                  </p>
                  <LinearProgress
                    variant="determinate"
                    value={progress}
                    sx={{ height: 8, borderRadius: 4, width: 'min(280px,80%)' }}
                  />
                  <span>{progress}% · Comparing 3 corridors</span>
                </div>
              ) : (
                <DispatchMap
                  selected={selected}
                  onSelect={setSelected}
                  checkpoint={checkpoint}
                  onCheckpoint={(index) => {
                    setCheckpoint(index);
                    setActiveTab('checkpoint');
                    setDrawer(true);
                  }}
                  opacity={opacity}
                  forecast={forecast}
                  state={state}
                />
              )}
              <label className="opacity-control floating-opacity">
                <span>
                  <LayersIcon sx={sx(15)} />
                  Heatmap
                </span>
                <Slider
                  size="small"
                  aria-label="Heatmap opacity"
                  min={0}
                  max={100}
                  step={5}
                  value={opacity}
                  onChange={(_, v) => setOpacity(v as number)}
                />
                <strong>{opacity}%</strong>
              </label>
            </div>
            <div className="map-legend">
              <div className="legend-risks">
                {riskLevels.map((risk) => (
                  <span key={risk}>
                    <RiskDot risk={risk} />
                    {risk}
                  </span>
                ))}
                {missing && (
                  <span>
                    <RiskDot risk="Unknown" />
                    Unknown
                  </span>
                )}
              </div>
              <span className="legend-selection">
                <span />
                Selected route
              </span>
            </div>
            <div className="forecast-panel">
              <div className="forecast-heading">
                <div>
                  <CloudIcon sx={sx(20)} />
                  <strong>Corridor forecast</strong>
                  <span>Radar & heatmap</span>
                </div>
                <span className="forecast-timestamp">
                  <span className="snapshot-dot" />
                  Depart +{forecast}h <span>•</span> {tripTime(applied.departure, forecast * 60)}{' '}
                  <span>•</span>
                  <small>Radar Snapshot</small>
                </span>
              </div>
              <div className="forecast-slider-row">
                <Tooltip title={playing ? 'Pause forecast' : 'Play forecast'}>
                  <IconButton
                    className="forecast-play"
                    color="primary"
                    aria-label={playing ? 'Pause forecast' : 'Play forecast'}
                    onClick={() => setPlaying(!playing)}
                  >
                    {playing ? <PauseIcon /> : <PlayIcon />}
                  </IconButton>
                </Tooltip>
                <div className="forecast-track">
                  <Slider
                    aria-label="Corridor forecast hours after departure"
                    min={0}
                    max={48}
                    step={1}
                    marks={[0, 12, 24, 36, 48].map((value) => ({ value }))}
                    value={forecast}
                    valueLabelDisplay="auto"
                    valueLabelFormat={(v) => `+${v}h`}
                    onChange={(_, v) => {
                      setForecast(v as number);
                      setPlaying(false);
                    }}
                  />
                  <div className="forecast-ticks">
                    {[0, 12, 24, 36, 48].map((v) => (
                      <span key={v}>{v === 0 ? 'Departure' : `+${v}h`}</span>
                    ))}
                  </div>
                </div>
              </div>
              <div className="forecast-note">
                <InfoIcon sx={sx(14)} />
                Corridor forecast only. Route ranking and checkpoint arrival weather stay unchanged.
              </div>
            </div>
          </section>
        </div>
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
