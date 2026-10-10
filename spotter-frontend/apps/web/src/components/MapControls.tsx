import { CenterFocusStrong, ZoomIn, ZoomOut } from '@mui/icons-material';
import { IconButton, Tooltip } from '@mui/material';

type Props = {
  onZoomIn: () => void;
  onZoomOut: () => void;
  onReset: () => void;
};

export function MapControls({ onZoomIn, onZoomOut, onReset }: Props) {
  return (
    <div className="map-controls">
      <Tooltip title="Zoom in">
        <IconButton aria-label="Zoom in" onClick={onZoomIn} size="small">
          <ZoomIn />
        </IconButton>
      </Tooltip>
      <Tooltip title="Zoom out">
        <IconButton aria-label="Zoom out" onClick={onZoomOut} size="small">
          <ZoomOut />
        </IconButton>
      </Tooltip>
      <Tooltip title="Reset map">
        <IconButton aria-label="Reset map" onClick={onReset} size="small">
          <CenterFocusStrong />
        </IconButton>
      </Tooltip>
    </div>
  );
}
