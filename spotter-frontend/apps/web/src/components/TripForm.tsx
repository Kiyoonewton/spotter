import { useEffect, useState, type FormEvent, type RefObject } from 'react';
import TextField from '@mui/material/TextField';
import MenuItem from '@mui/material/MenuItem';
import InputAdornment from '@mui/material/InputAdornment';
import Button from '@mui/material/Button';
import CalendarIcon from '@mui/icons-material/EventOutlined';
import ScaleIcon from '@mui/icons-material/ScaleOutlined';
import RouteIcon from '@mui/icons-material/RouteOutlined';
import ArrowRightIcon from '@mui/icons-material/ArrowForwardRounded';
import PlaceIcon from '@mui/icons-material/PlaceOutlined';

const sx = (fontSize: number) => ({ fontSize });

type Props = {
  origin: string;
  destination: string;
  departure: string;
  weight: string;
  spacing: string;
  departureRef: RefObject<HTMLInputElement | null>;
  error: string;
  onOrigin: (value: string) => void;
  onDestination: (value: string) => void;
  onDeparture: (value: string) => void;
  onWeight: (value: string) => void;
  onSpacing: (value: string) => void;
  onSubmit: (event: FormEvent) => void;
};

export function TripForm(props: Props) {
  // SSR controls must not accept edits or native submission before React attaches handlers.
  const [ready, setReady] = useState(false);
  useEffect(() => setReady(true), []);
  const {
    origin,
    destination,
    departure,
    weight,
    spacing,
    departureRef,
    error,
    onOrigin,
    onDestination,
    onDeparture,
    onWeight,
    onSpacing,
    onSubmit,
  } = props;
  return (
    <form className="trip-form" onSubmit={onSubmit}>
      <TextField
        disabled={!ready}
        className="trip-field-mui"
        label="Origin"
        value={origin}
        onChange={(e) => onOrigin(e.target.value)}
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
        disabled={!ready}
        className="trip-field-mui"
        label="Destination"
        value={destination}
        onChange={(e) => onDestination(e.target.value)}
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
        disabled={!ready}
        className="trip-field-mui"
        label="Departure · CDT"
        type="datetime-local"
        value={departure}
        onChange={(e) => onDeparture(e.target.value)}
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
        disabled={!ready}
        className="trip-field-mui"
        label="Load weight"
        type="number"
        value={weight}
        onChange={(e) => onWeight(e.target.value)}
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
        disabled={!ready}
        className="trip-field-mui"
        select
        label="Checkpoints"
        value={spacing}
        onChange={(e) => onSpacing(e.target.value)}
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
        disabled={!ready}
        variant="contained"
        size="large"
        type="submit"
        startIcon={<RouteIcon />}
        endIcon={<ArrowRightIcon />}
      >
        Compare routes
      </Button>
    </form>
  );
}
