export function IllustrativeBasemap() {
  return (
    <>
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
    </>
  );
}
