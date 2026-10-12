import Button from '@mui/material/Button';
import ArrowForwardIcon from '@mui/icons-material/ArrowForwardRounded';

export function DispatchIntro() {
  return (
    <section className="dispatch-intro" aria-label="Dispatch introduction">
      <picture className="intro-art">
        <source media="(prefers-reduced-motion: reduce)" srcSet="/dispatch-intro-static.svg" />
        <img
          src="https://raw.githubusercontent.com/Kiyoonewton/spotter-ui/main/public/background.gif"
          alt=""
          width="800"
          height="450"
          loading="lazy"
          decoding="async"
        />
      </picture>
      <div className="intro-copy">
        <span>WEATHER-AWARE DISPATCH</span>
        <h2>A clearer road ahead.</h2>
        <p>
          Compare truck corridors, inspect arrival-time weather, and understand each route’s risk.
        </p>
        <Button
          component="a"
          href="#trip-planning"
          variant="contained"
          endIcon={<ArrowForwardIcon />}
        >
          Plan a trip
        </Button>
      </div>
    </section>
  );
}
