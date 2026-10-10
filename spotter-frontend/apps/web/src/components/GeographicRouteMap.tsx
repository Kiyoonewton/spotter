import { useState } from 'react';
import Alert from '@mui/material/Alert';
import Button from '@mui/material/Button';
import Chip from '@mui/material/Chip';
import Stack from '@mui/material/Stack';
import { MapControls } from './MapControls';
import {
  fitRoutes,
  MAP_HEIGHT,
  MAP_WIDTH,
  ownedSegments,
  RISK_COLOURS,
  validCoordinate,
  viewport,
  visibleTiles,
  type MapRoute,
} from '@/lib/geographic-map';

type Props = {
  routes: readonly MapRoute[];
  selected: string;
  checkpoint: number;
  onRoute: (id: string) => void;
  onCheckpoint: (index: number) => void;
};

export function GeographicRouteMap(props: Props) {
  const [zoomOffset, setZoomOffset] = useState(0);
  const [pan, setPan] = useState({ x: 0, y: 0 });
  const [tileFailed, setTileFailed] = useState(false);
  const fit = fitRoutes(props.routes);
  if (!fit) {
    return (
      <section className="map-workspace" aria-label="Geographic route map">
        <Alert severity="warning">
          Route geometry unavailable. Route comparison and checkpoint inspection remain available.
        </Alert>
      </section>
    );
  }
  const view = viewport(fit, zoomOffset, pan);
  const selectedRoute = props.routes.find((route) => route.id === props.selected);
  const displayRoutes = [...props.routes].sort(
    (a, b) => Number(a.id === props.selected) - Number(b.id === props.selected),
  );
  const move = (x: number, y: number) => setPan((value) => ({ x: value.x + x, y: value.y + y }));
  return (
    <section className="map-workspace" aria-label="Geographic route map">
      <div className="map-header">
        <strong>Live route geography</strong>
        <Chip size="small" label="Arrival-time segment risk" variant="outlined" />
      </div>
      {tileFailed && (
        <Alert severity="warning">Basemap tiles unavailable. Route geometry remains visible.</Alert>
      )}
      <div style={{ position: 'relative' }}>
        <svg
          viewBox={`0 0 ${MAP_WIDTH} ${MAP_HEIGHT}`}
          style={{ display: 'block', width: '100%', background: '#edf1f4' }}
          aria-label="Live route geometry and checkpoints"
        >
          <title>Routes projected from provider coordinates</title>
          {visibleTiles(view).map((tile) => (
            <image
              key={`${view.zoom}-${tile.left}-${tile.top}`}
              href={`https://tile.openstreetmap.org/${view.zoom}/${tile.x}/${tile.y}.png`}
              x={tile.left}
              y={tile.top}
              width={256}
              height={256}
              onError={() => setTileFailed(true)}
              aria-hidden="true"
            />
          ))}
          {displayRoutes.map((route) =>
            ownedSegments(route).map((segment) => {
              const points = segment.coordinates
                .map((coordinate) => {
                  const point = view.point(coordinate);
                  return `${point.x},${point.y}`;
                })
                .join(' ');
              return (
                <g key={segment.id}>
                  <polyline points={points} fill="none" stroke="white" strokeWidth={11} />
                  <polyline
                    points={points}
                    fill="none"
                    stroke={RISK_COLOURS[segment.risk] ?? RISK_COLOURS['Unknown']}
                    strokeWidth={route.id === props.selected ? 7 : 4}
                    strokeDasharray={segment.risk === 'Unknown' ? '8 5' : undefined}
                    opacity={route.id === props.selected ? 1 : 0.6}
                    role="button"
                    tabIndex={0}
                    aria-label={`Map route ${route.id}, ${segment.risk} segment`}
                    aria-pressed={route.id === props.selected}
                    onClick={() => props.onRoute(route.id)}
                    onKeyDown={(event) => {
                      if (event.key === 'Enter' || event.key === ' ') {
                        event.preventDefault();
                        props.onRoute(route.id);
                      }
                    }}
                  />
                </g>
              );
            }),
          )}
          {selectedRoute?.checkpoints.map((checkpoint, index) => {
            if (
              checkpoint.route_id !== selectedRoute.id ||
              !validCoordinate(checkpoint.coordinates)
            ) {
              return null;
            }
            const point = view.point(checkpoint.coordinates);
            return (
              <circle
                key={checkpoint.id}
                cx={point.x}
                cy={point.y}
                r={index === props.checkpoint ? 9 : 6}
                fill={RISK_COLOURS[checkpoint.risk] ?? RISK_COLOURS['Unknown']}
                stroke={index === props.checkpoint ? '#101c2b' : 'white'}
                strokeWidth={3}
                role="button"
                tabIndex={0}
                aria-label={`Map checkpoint ${index + 1} on route ${selectedRoute.id}`}
                aria-pressed={index === props.checkpoint}
                onClick={() => props.onCheckpoint(index)}
                onKeyDown={(event) => {
                  if (event.key === 'Enter' || event.key === ' ') {
                    event.preventDefault();
                    props.onCheckpoint(index);
                  }
                }}
              >
                <title>{`${checkpoint.distance_from_origin_miles} mi · ${checkpoint.risk} · ${checkpoint.arrival_at}`}</title>
              </circle>
            );
          })}
        </svg>
        <MapControls
          onZoomIn={() => setZoomOffset((value) => Math.min(17 - fit.zoom, value + 1))}
          onZoomOut={() => setZoomOffset((value) => Math.max(1 - fit.zoom, value - 1))}
          onReset={() => {
            setZoomOffset(0);
            setPan({ x: 0, y: 0 });
          }}
        />
      </div>
      <Stack direction="row" sx={{ justifyContent: 'center' }} aria-label="Pan geographic map">
        <Button onClick={() => move(-160, 0)} aria-label="Pan west">
          West
        </Button>
        <Button onClick={() => move(0, -100)} aria-label="Pan north">
          North
        </Button>
        <Button onClick={() => move(0, 100)} aria-label="Pan south">
          South
        </Button>
        <Button onClick={() => move(160, 0)} aria-label="Pan east">
          East
        </Button>
      </Stack>
      <div className="map-legend" style={{ flexWrap: 'wrap' }}>
        {Object.entries(RISK_COLOURS).map(([risk, colour]) => (
          <span key={risk}>
            <span style={{ color: colour }}>●</span> {risk}
          </span>
        ))}
      </div>
      <div style={{ padding: '8px 16px', fontSize: 12 }}>
        © <a href="https://www.openstreetmap.org/copyright">OpenStreetMap contributors</a>
        {' · '}Risk colours use checkpoint arrival forecasts. Corridor forecast playback is not
        available yet.
      </div>
    </section>
  );
}
