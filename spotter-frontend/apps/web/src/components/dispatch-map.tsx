import { useState } from 'react';
import { Minus, Plus, LocateFixed, Layers, MapPin } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { checkpoints, type DemoState, type RouteId } from '@/lib/dispatch-data';

type Props = {
  selected: RouteId;
  onSelect: (id: RouteId) => void;
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
  const paths = {
    A: 'M145 214 L205 212 L287 202 L390 208 L490 200 L592 209 L694 236 L800 352',
    B: 'M145 214 L194 228 L302 249 L413 295 L490 304 L575 319 L652 315 L734 293 L800 352',
    C: 'M145 214 L166 302 L216 392 L325 429 L460 445 L588 439 L709 436 L800 352',
  };
  return (
    <div
      className="map-canvas"
      aria-label="Illustrative interactive Chicago to Pittsburgh route map"
    >
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
          <rect x="-500" y="-500" width="1940" height="1590" fill="url(#map-grid)" />
          <path
            d="M105 -30 C180 30 230 30 245 95 L205 166 L158 198 L124 169 L128 113 L96 80Z"
            fill="var(--map-water)"
          />
          <path
            d="M348 -20 L480 -20 L462 56 L410 95 L354 69 L337 32Z M495 54 L548 85 L550 151 L512 189 L488 171 L468 111Z"
            fill="var(--map-water)"
          />
          <path
            d="M580 141 C674 147 773 112 857 84 L925 94 L897 134 L766 173 L661 189 L576 184Z"
            fill="var(--map-water)"
          />
          <g
            stroke="var(--map-boundary)"
            strokeWidth="1"
            strokeDasharray="3 7"
            strokeLinecap="round"
            fill="none"
          >
            <path d="M175 205V590 M450 100V590 M719 180V590 M-50 415L900 415 M175 142L450 142" />
          </g>
          <g fill="none" stroke="var(--map-road)" strokeWidth="2">
            <path d="M0 274L940 230 M20 510L900 388 M90 50L215 590 M338 140L325 590 M500 120L588 590 M0 365L940 340 M0 455L940 470 M750 170L839 590 M0 545L940 540" />
            <path d="M145 214L225 185L346 180L460 240L575 250L740 250L850 185 M145 214L280 332L440 380L600 360L800 352" />
          </g>
          <g className="state-label">
            <text x="30" y="355">
              ILLINOIS
            </text>
            <text x="259" y="362">
              INDIANA
            </text>
            <text x="565" y="390">
              OHIO
            </text>
            <text x="800" y="260">
              PENNSYLVANIA
            </text>
            <text x="280" y="108">
              MICHIGAN
            </text>
            <text x="787" y="532">
              WEST VIRGINIA
            </text>
          </g>
          <g className="lake-label">
            <text x="158" y="90" transform="rotate(-63 158 90)">
              Lake Michigan
            </text>
            <text x="705" y="151" transform="rotate(-13 705 151)">
              Lake Erie
            </text>
          </g>
          <g
            pointerEvents="none"
            opacity={opacity / 100}
            transform={`translate(${forecast * 2.4} ${forecast * -0.45})`}
          >
            <path
              d="M250 183C261 127 331 112 372 161S418 216 461 242S499 303 453 332S375 308 346 270S240 246 250 183Z"
              fill="url(#radar-moderate)"
            />
            <path
              d="M316 174C341 146 378 166 394 190S435 207 441 240S410 289 379 272S296 215 316 174Z"
              fill="url(#radar-severe)"
            />
            <path
              d="M406 264C428 235 487 249 511 285S531 339 482 365S407 338 400 310S391 283 406 264Z"
              fill="url(#radar-high)"
            />
            <path
              d="M538 299C554 263 603 251 637 260S704 253 731 284S714 340 676 351S557 371 539 338S526 318 538 299Z"
              fill="url(#radar-low)"
            />
            <g className="radar-contours" fill="none" strokeWidth="1">
              <path
                d="M292 178C320 150 347 176 365 201S419 229 421 267S375 285 352 255S273 212 292 178Z"
                stroke="var(--risk-moderate)"
              />
              <path
                d="M345 185C364 169 385 190 395 205S418 226 407 247S374 255 360 232S332 199 345 185Z"
                stroke="var(--risk-severe)"
              />
              <path
                d="M427 274C451 254 481 280 490 299S492 334 467 341S421 316 427 274Z"
                stroke="var(--risk-high)"
              />
              <path
                d="M566 299C590 275 617 285 640 282S684 280 699 300S660 334 624 336S548 319 566 299Z"
                stroke="var(--risk-low)"
              />
            </g>
          </g>
          {(['A', 'B', 'C'] as RouteId[]).map((id) => (
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
                  <path d={paths[id]} fill="none" stroke="var(--foreground)" strokeWidth="13" />
                  <path d={paths[id]} fill="none" stroke="var(--background)" strokeWidth="10" />
                </>
              )}
              <path
                d={paths[id]}
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
              <path d={paths[id]} fill="none" stroke="transparent" strokeWidth="26" />
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
          <circle
            cx="145"
            cy="214"
            r="9"
            fill="var(--foreground)"
            stroke="var(--background)"
            strokeWidth="3"
          />
          <circle
            cx="800"
            cy="352"
            r="9"
            fill="var(--primary)"
            stroke="var(--background)"
            strokeWidth="3"
          />
        </g>
      </svg>
      <div className="map-top-label">
        <MapPin size={14} /> Midwest corridor <span>Illustrative map</span>
      </div>
      <div className="map-controls">
        <Button
          variant="outline"
          title="Zoom in"
          aria-label="Zoom in"
          onClick={() => setZoom(Math.min(2, zoom + 0.2))}
        >
          <Plus />
        </Button>
        <Button
          variant="outline"
          title="Zoom out"
          aria-label="Zoom out"
          onClick={() => setZoom(Math.max(0.7, zoom - 0.2))}
        >
          <Minus />
        </Button>
        <Button
          variant="outline"
          title="Reset map"
          aria-label="Reset map"
          onClick={() => {
            setZoom(1);
            setOffset({ x: 0, y: 0 });
          }}
        >
          <LocateFixed />
        </Button>
      </div>
      <div className="map-scale">
        <span />
        50 mi
      </div>
      <div className="map-attribution">
        <Layers size={12} /> Illustrative geography · Not for navigation
      </div>
    </div>
  );
}
