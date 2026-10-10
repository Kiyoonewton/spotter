import { useEffect, useState, type FormEvent, type RefObject } from 'react';
import TextField from '@mui/material/TextField';
import MenuItem from '@mui/material/MenuItem';
import InputAdornment from '@mui/material/InputAdornment';
import Button from '@mui/material/Button';
import CalendarIcon from '@mui/icons-material/EventOutlined';
import ScaleIcon from '@mui/icons-material/ScaleOutlined';
import RouteIcon from '@mui/icons-material/RouteOutlined';
import ArrowRightIcon from '@mui/icons-material/ArrowForwardRounded';
import Autocomplete from '@mui/material/Autocomplete';
import PlaceIcon from '@mui/icons-material/PlaceOutlined';
import type { LocationCandidate } from '@/services/api';
import type { AnalysisMode } from '@/hooks/useTripAnalysis';

const sx = (fontSize: number) => ({ fontSize });

type Props = {
  mode?: AnalysisMode;
  origin: string;
  destination: string;
  departure: string;
  weight: string;
  spacing: string;
  departureRef: RefObject<HTMLInputElement | null>;
  error: string;
  originCandidate?: LocationCandidate | null;
  destinationCandidate?: LocationCandidate | null;
  originOptions?: LocationCandidate[];
  destinationOptions?: LocationCandidate[];
  originLoading?: boolean;
  destinationLoading?: boolean;
  locationError?: string;
  onOrigin: (value: string) => void;
  onDestination: (value: string) => void;
  onDeparture: (value: string) => void;
  onWeight: (value: string) => void;
  onSpacing: (value: string) => void;
  onSubmit: (event: FormEvent) => void;
  onOriginCandidate?: (candidate: LocationCandidate | null) => void;
  onDestinationCandidate?: (candidate: LocationCandidate | null) => void;
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
    originCandidate = null,
    destinationCandidate = null,
    originOptions = [],
    destinationOptions = [],
    originLoading = false,
    destinationLoading = false,
    locationError = '',
    onOrigin,
    onDestination,
    onDeparture,
    onWeight,
    onSpacing,
    onSubmit,
    onOriginCandidate = () => undefined,
    onDestinationCandidate = () => undefined,
  } = props;
  return (
    <form className="trip-form" onSubmit={onSubmit}>
      <Autocomplete
        options={originOptions}
        value={originCandidate}
        inputValue={origin}
        onInputChange={(_, value) => onOrigin(value)}
        onChange={(_, value) => {
          onOriginCandidate(value);
          onOrigin(value?.label ?? '');
        }}
        getOptionLabel={(option) => option.label}
        isOptionEqualToValue={(option, value) => option.provider_id === value.provider_id}
        loading={originLoading}
        noOptionsText={origin.length < 2 ? 'Type at least 2 characters' : 'No locations found'}
        renderInput={(params) => (
          <TextField
            {...params}
            disabled={!ready}
            className="trip-field-mui"
            label="Origin"
            error={Boolean(locationError)}
            helperText={locationError || undefined}
          />
        )}
      />
      <ArrowRightIcon className="trip-arrow" sx={sx(18)} />
      <Autocomplete
        options={destinationOptions}
        value={destinationCandidate}
        inputValue={destination}
        onInputChange={(_, value) => onDestination(value)}
        onChange={(_, value) => {
          onDestinationCandidate(value);
          onDestination(value?.label ?? '');
        }}
        getOptionLabel={(option) => option.label}
        isOptionEqualToValue={(option, value) => option.provider_id === value.provider_id}
        loading={destinationLoading}
        noOptionsText={destination.length < 2 ? 'Type at least 2 characters' : 'No locations found'}
        renderInput={(params) => (
          <TextField
            {...params}
            disabled={!ready}
            className="trip-field-mui"
            label="Destination"
            error={Boolean(locationError)}
          />
        )}
      />
      {/* The mode label keeps the selected provider context visible to keyboard and screen-reader users. */}
      <span className="sr-only">
        {props.mode === 'live' ? 'Live provider locations' : 'Demo locations'}
      </span>
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
