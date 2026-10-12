import { useMemo, useState } from 'react';
import Dialog from '@mui/material/Dialog';
import DialogTitle from '@mui/material/DialogTitle';
import DialogContent from '@mui/material/DialogContent';
import DialogActions from '@mui/material/DialogActions';
import Button from '@mui/material/Button';
import Alert from '@mui/material/Alert';
import type { TripAnalysis } from '@/services/api';
import { scenarioAnalysis, type DepartureWindow } from '@/services/departure-comparison';
import { GeographicRouteMap } from './GeographicRouteMap';
import { DriverBriefing } from './DriverBriefing';
export function DepartureScenarioDialog({
  original,
  window,
  selected,
  onClose,
}: {
  original: TripAnalysis;
  window: DepartureWindow;
  selected: string;
  onClose: () => void;
}) {
  const [checkpoint, setCheckpoint] = useState(0);
  const [routeId, setRouteId] = useState(selected);
  const preview = useMemo(() => scenarioAnalysis(original, window), [original, window]);
  return (
    <Dialog open onClose={onClose} fullWidth maxWidth="lg" className="briefing-dialog">
      <DialogTitle>Departure scenario · +{window.offset_hours}h</DialogTitle>
      <DialogContent>
        <Alert severity="info">
          Weather-only scenario using saved roads and driving times. Traffic and driver breaks are
          not recalculated. Run a new trip analysis before adopting this departure.
        </Alert>
        {original.data_source === 'live' && (
          <div className="scenario-preview-map">
            <GeographicRouteMap
              routes={preview.routes}
              selected={routeId}
              checkpoint={checkpoint}
              onRoute={(id) => {
                setRouteId(id);
                setCheckpoint(0);
              }}
              onCheckpoint={setCheckpoint}
            />
          </div>
        )}
        <DriverBriefing analysis={preview} selected={routeId} />
      </DialogContent>
      <DialogActions>
        <Button onClick={onClose}>Close scenario</Button>
        <Button onClick={() => windowPrint()}>Print scenario</Button>
      </DialogActions>
    </Dialog>
  );
}
function windowPrint() {
  window.print();
}
