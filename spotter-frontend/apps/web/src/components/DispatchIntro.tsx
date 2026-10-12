import { useState } from 'react';
import IconButton from '@mui/material/IconButton';
import PauseIcon from '@mui/icons-material/PauseRounded';
import PlayIcon from '@mui/icons-material/PlayArrowRounded';
import Button from '@mui/material/Button';
import ArrowForwardIcon from '@mui/icons-material/ArrowForwardRounded';

export function DispatchIntro() {
  const [animated, setAnimated] = useState(true);
  return (
    <section className="dispatch-intro" aria-label="Dispatch introduction">
      <picture className="intro-art">
        <source media="(prefers-reduced-motion: reduce)" srcSet="/dispatch-intro-static.svg" />
        <img
          src={
            animated
              ? 'https://raw.githubusercontent.com/Kiyoonewton/spotter-ui/main/public/background.gif'
              : '/dispatch-intro-static.svg'
          }
          alt=""
          width="800"
          height="450"
          loading="lazy"
          decoding="async"
        />
      </picture>
      <IconButton
        className="intro-motion-toggle"
        aria-label={animated ? 'Pause intro animation' : 'Play intro animation'}
        onClick={() => setAnimated((value) => !value)}
      >
        {animated ? <PauseIcon /> : <PlayIcon />}
      </IconButton>
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
