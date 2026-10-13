import { useState } from 'react';
import Button from '@mui/material/Button';
import Alert from '@mui/material/Alert';
import Dialog from '@mui/material/Dialog';
import DialogTitle from '@mui/material/DialogTitle';
import DialogContent from '@mui/material/DialogContent';
import DialogActions from '@mui/material/DialogActions';
import PrintIcon from '@mui/icons-material/PrintOutlined';
import LinkIcon from '@mui/icons-material/LinkOutlined';
import type { TripAnalysis } from '@/services/api';
import { DriverBriefing } from './DriverBriefing';

export function SavedTripTools({
  analysis,
  selected,
}: {
  analysis: TripAnalysis;
  selected: string;
}) {
  const [open, setOpen] = useState(false);
  const [message, setMessage] = useState('');
  const [link, setLink] = useState('');
  const share = async () => {
    if (!analysis.snapshot) return;
    const url = new URL(window.location.pathname, window.location.origin);
    url.hash = new URLSearchParams({ analysis: analysis.snapshot.token }).toString();
    setLink(url.href);
    try {
      await navigator.clipboard.writeText(url.href);
      setMessage('Saved trip link copied.');
    } catch {
      setMessage('Copy the saved trip link below.');
    }
  };
  return (
    <section
      className="saved-trip-tools"
      aria-label="Saved trip and driver briefing"
      style={{ gridColumn: '1 / -1', minWidth: 0 }}
    >
      <p>
        {analysis.snapshot?.restored
          ? 'Viewing a saved arrival-time snapshot. Re-analyze for current forecasts; the hourly timeline is not saved.'
          : analysis.snapshot
            ? 'Analysis saved for 7 days. Reopening preserves the original arrival weather and recommendation.'
            : (analysis.snapshot_notice ?? 'A saved link is unavailable for this analysis.')}
      </p>
      <Button startIcon={<LinkIcon />} disabled={!analysis.snapshot} onClick={() => void share()}>
        Copy saved trip link
      </Button>
      <Button
        startIcon={<PrintIcon />}
        disabled={!analysis.applied_request}
        onClick={() => setOpen(true)}
      >
        Driver briefing
      </Button>
      {analysis.snapshot && (
        <small>
          Anyone with the link can view this trip. Share it only with intended recipients.
        </small>
      )}
      {message && (
        <Alert severity="info" role="status">
          {message}
        </Alert>
      )}
      {link && (
        <input
          aria-label="Saved trip link"
          readOnly
          value={link}
          onFocus={(event) => event.target.select()}
          style={{ width: '100%', boxSizing: 'border-box' }}
        />
      )}
      <Dialog
        open={open}
        onClose={() => setOpen(false)}
        fullWidth
        maxWidth="md"
        className="briefing-dialog"
      >
        <DialogTitle>Driver briefing</DialogTitle>
        <DialogContent>
          <DriverBriefing analysis={analysis} selected={selected} />
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setOpen(false)}>Close</Button>
          <Button startIcon={<PrintIcon />} onClick={() => window.print()}>
            Print / Save PDF
          </Button>
        </DialogActions>
      </Dialog>
    </section>
  );
}
