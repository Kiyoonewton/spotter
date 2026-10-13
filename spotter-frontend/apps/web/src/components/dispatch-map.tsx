import { useState } from 'react';
import { checkpoints, type DemoState } from '@/lib/dispatch-data';
import { ILLUSTRATIVE_MAP_LABEL, ROUTE_PATHS } from './dispatch-map-geometry';
import { IllustrativeBasemap } from './IllustrativeBasemap';
import { IllustrativeForecastOverlay } from './IllustrativeForecastOverlay';
import { MapAttribution } from './MapAttribution';
import { MapControls } from './MapControls';
import { MapEndpoints } from './MapEndpoints';

type Props = {
  selected: string;
  onSelect: (id: string) => void;
  checkpoint: number;
  onCheckpoint: (index: number) => void;
  opacity: number;
  forecast: number;
  state: DemoState;
};
export function DispatchMap({
  selected,
  onSelect,
  checkpoint,
  onCheckpoint,
  opacity,
  forecast,
  state,
}: Props) {
  const [zoom, setZoom] = useState(1);
  const [offset, setOffset] = useState({ x: 0, y: 0 });
  const [drag, setDrag] = useState<{ x: number; y: number } | null>(null);
  const blocked = state === 'blocked';
  const missing = state === 'missing';
  return (
    <div className="map-canvas" aria-label={ILLUSTRATIVE_MAP_LABEL}>
      <svg
        viewBox="0 0 940 590"
        className="route-map"
        onPointerDown={(e) => {
          if ((e.target as Element).closest('[data-map-control]')) return;
          setDrag({ x: e.clientX - offset.x, y: e.clientY - offset.y });
          e.currentTarget.setPointerCapture(e.pointerId);
        }}
        onPointerMove={(e) => {
          if (drag) setOffset({ x: e.clientX - drag.x, y: e.clientY - drag.y });
        }}
        onPointerUp={() => setDrag(null)}
      >
        <defs>
          <pattern
            id="unknown-hatch"
            width="8"
            height="8"
            patternUnits="userSpaceOnUse"
            patternTransform="rotate(45)"
          >
            <rect width="8" height="8" fill="var(--unknown)" />
            <rect width="3" height="8" fill="var(--map-road)" />
          </pattern>
          <pattern id="map-grid" width="46" height="46" patternUnits="userSpaceOnUse">
            <path d="M46 0H0V46" fill="none" stroke="var(--map-grid)" strokeWidth=".6" />
          </pattern>
          <filter id="weather-soft">
            <feGaussianBlur stdDeviation="13" />
          </filter>
          <radialGradient id="radar-moderate">
            <stop offset="0" stopColor="var(--risk-moderate)" stopOpacity=".8" />
            <stop offset=".55" stopColor="var(--risk-moderate)" stopOpacity=".38" />
            <stop offset="1" stopColor="var(--risk-moderate)" stopOpacity="0" />
          </radialGradient>
          <radialGradient id="radar-severe">
            <stop offset="0" stopColor="var(--risk-severe)" stopOpacity=".85" />
            <stop offset=".45" stopColor="var(--risk-high)" stopOpacity=".65" />
            <stop offset="1" stopColor="var(--risk-high)" stopOpacity="0" />
          </radialGradient>
          <radialGradient id="radar-high">
            <stop offset="0" stopColor="var(--risk-high)" stopOpacity=".85" />
            <stop offset=".6" stopColor="var(--risk-moderate)" stopOpacity=".4" />
            <stop offset="1" stopColor="var(--risk-moderate)" stopOpacity="0" />
          </radialGradient>
          <radialGradient id="radar-low">
            <stop offset="0" stopColor="var(--risk-low)" stopOpacity=".65" />
            <stop offset="1" stopColor="var(--risk-low)" stopOpacity="0" />
          </radialGradient>
        </defs>
        <rect width="940" height="590" fill="var(--map-land)" />
        <g
          transform={`translate(${offset.x} ${offset.y}) translate(470 295) scale(${zoom}) translate(-470 -295)`}
        >
          <IllustrativeBasemap />
          <IllustrativeForecastOverlay forecastHour={forecast} opacity={opacity} />
          {['A', 'B', 'C'].map((id) => (
            <g
              key={id}
              data-map-control="true"
              onClick={() => onSelect(id)}
              role="button"
              tabIndex={0}
              aria-label={`Select Route ${id}`}
              onKeyDown={(e) => {
                if (e.key === 'Enter' || e.key === ' ') onSelect(id);
              }}
              className="map-route-click"
            >
              {selected === id && (
                <>
                  <path
                    d={ROUTE_PATHS[id]}
                    fill="none"
                    stroke="var(--foreground)"
                    strokeWidth="13"
                  />
                  <path
                    d={ROUTE_PATHS[id]}
                    fill="none"
                    stroke="var(--background)"
                    strokeWidth="10"
                  />
                </>
              )}
              <path
                d={ROUTE_PATHS[id]}
                fill="none"
                stroke={blocked ? 'var(--risk-no-travel)' : 'var(--risk-low)'}
                strokeWidth="6"
                strokeLinecap="round"
              />
              {!blocked && id === 'A' && (
                <>
                  <path
                    d="M287 202L390 208L490 200"
                    fill="none"
                    stroke="var(--risk-severe)"
                    strokeWidth="6"
                  />
                  <path
                    d="M490 200L592 209L694 236"
                    fill="none"
                    stroke="var(--risk-high)"
                    strokeWidth="6"
                  />
                </>
              )}
              {!blocked && id === 'B' && (
                <>
                  <path
                    d="M194 228L302 249L413 295"
                    fill="none"
                    stroke="var(--risk-moderate)"
                    strokeWidth="6"
                  />
                  <path
                    d="M413 295L490 304"
                    fill="none"
                    stroke="var(--risk-high)"
                    strokeWidth="6"
                  />
                  <path
                    d="M490 304L575 319L652 315"
                    fill="none"
                    stroke={missing ? 'url(#unknown-hatch)' : 'var(--risk-moderate)'}
                    strokeWidth={missing ? 10 : 6}
                  />
                </>
              )}
              {!blocked && id === 'C' && (
                <path
                  d="M325 429L460 445L588 439"
                  fill="none"
                  stroke="var(--risk-high)"
                  strokeWidth="6"
                />
              )}
              <path d={ROUTE_PATHS[id]} fill="none" stroke="transparent" strokeWidth="26" />
              <g
                transform={`translate(${id === 'A' ? 540 : id === 'B' ? 555 : 493} ${id === 'A' ? 205 : id === 'B' ? 317 : 446})`}
              >
                <rect x="-22" y="-22" width="44" height="44" fill="transparent" />
                <rect
                  x="-15"
                  y="-15"
                  width="30"
                  height="30"
                  rx="5"
                  fill="var(--background)"
                  stroke="var(--foreground)"
                  strokeWidth={selected === id ? 2 : 1}
                />
                <text textAnchor="middle" y="5" className="route-letter">
                  {id}
                </text>
              </g>
            </g>
          ))}
          {checkpoints.map((cp, i) => (
            <g
              key={cp.city}
              data-map-control="true"
              role="button"
              tabIndex={0}
              aria-label={`Inspect ${cp.city} checkpoint`}
              onClick={() => {
                onSelect('B');
                onCheckpoint(i);
              }}
              onKeyDown={(e) => {
                if (e.key === 'Enter') {
                  onSelect('B');
                  onCheckpoint(i);
                }
              }}
              className="checkpoint-dot"
            >
              <circle cx={cp.x} cy={cp.y} r="22" fill="transparent" />
              <circle
                cx={cp.x}
                cy={cp.y}
                r={checkpoint === i ? 8 : 5}
                fill="var(--background)"
                stroke="var(--foreground)"
                strokeWidth={checkpoint === i ? 3 : 1.5}
              />
            </g>
          ))}
          <g className="highway-shields" pointerEvents="none">
            {[
              { x: 246, y: 191, label: 'I-80' },
              { x: 496, y: 330, label: 'US-30' },
              { x: 621, y: 451, label: 'I-70' },
            ].map((shield) => (
              <g key={shield.label} transform={`translate(${shield.x} ${shield.y})`}>
                <path d="M-20 -10Q0 -14 20 -10L18 7Q0 22 -18 7Z" />
                <text y="5" textAnchor="middle">
                  {shield.label}
                </text>
              </g>
            ))}
          </g>
          <g className="city-waypoints" pointerEvents="none">
            <circle cx="490" cy="200" r="3" />
            <circle cx="675" cy="240" r="3" />
            <circle cx="389" cy="435" r="3" />
            <circle cx="609" cy="391" r="3" />
            <circle cx="512" cy="135" r="3" />
          </g>
          <g className="city-label" pointerEvents="none">
            <text x="72" y="201" className="major-city">
              Chicago
            </text>
            <text x="805" y="376" className="major-city">
              Pittsburgh
            </text>
            <text x="262" y="236">
              South Bend
            </text>
            <text x="364" y="323">
              Fort Wayne
            </text>
            <text x="363" y="454">
              Indianapolis
            </text>
            <text x="583" y="405">
              Columbus
            </text>
            <text x="667" y="225">
              Cleveland
            </text>
            <text x="487" y="189">
              Toledo
            </text>
            <text x="499" y="125">
              Detroit
            </text>
            <text x="27" y="139">
              Milwaukee
            </text>
          </g>
          <MapEndpoints />
        </g>
      </svg>
      <MapControls
        onZoomIn={() => setZoom(Math.min(2, zoom + 0.2))}
        onZoomOut={() => setZoom(Math.max(0.7, zoom - 0.2))}
        onReset={() => {
          setZoom(1);
          setOffset({ x: 0, y: 0 });
        }}
      />
      <MapAttribution />
    </div>
  );
}
