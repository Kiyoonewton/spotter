type Props = { forecastHour: number; opacity: number };

/** Illustrative forecast imagery only; it never changes API route risk or checkpoint weather. */
export function IllustrativeForecastOverlay({ forecastHour, opacity }: Props) {
  return (
    <g
      pointerEvents="none"
      opacity={opacity / 100}
      transform={`translate(${forecastHour * 2.4} ${forecastHour * -0.45})`}
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
  );
}
