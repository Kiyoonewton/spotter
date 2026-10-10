import MenuItem from '@mui/material/MenuItem';
import TextField from '@mui/material/TextField';
import ToggleButton from '@mui/material/ToggleButton';
import ToggleButtonGroup from '@mui/material/ToggleButtonGroup';
import ScienceIcon from '@mui/icons-material/ScienceOutlined';
import type { DemoState } from '@/lib/dispatch-data';

type Props = { state: DemoState; onChange: (state: DemoState) => void };
const options: Array<{ id: DemoState; label: string }> = [
  { id: 'results', label: 'Desktop results' },
  { id: 'mobile', label: 'Mobile preview' },
  { id: 'loading', label: 'Calculating' },
  { id: 'missing', label: 'Missing forecast' },
  { id: 'blocked', label: 'All routes blocked' },
];

export function DemoStateSwitcher({ state, onChange }: Props) {
  const select = (value: DemoState | null) => value && onChange(value);
  return (
    <div className="demo-bar">
      <div className="demo-label">
        <ScienceIcon sx={{ fontSize: 15 }} />
        <strong>PROTOTYPE</strong>
        <span>Illustrative demo scenarios only</span>
      </div>
      <ToggleButtonGroup
        exclusive
        size="small"
        className="demo-switcher"
        aria-label="Demo state"
        value={state}
        onChange={(_, value: DemoState | null) => select(value)}
      >
        {options.map((option) => (
          <ToggleButton
            key={option.id}
            value={option.id}
            className={state === option.id ? 'demo-active' : ''}
          >
            {option.label}
          </ToggleButton>
        ))}
      </ToggleButtonGroup>
      <TextField
        select
        size="small"
        className="demo-select"
        slotProps={{ htmlInput: { 'aria-label': 'Demo state' } }}
        value={state}
        onChange={(event) => onChange(event.target.value as DemoState)}
      >
        {options.map((option) => (
          <MenuItem key={option.id} value={option.id}>
            {option.label}
          </MenuItem>
        ))}
      </TextField>
    </div>
  );
}
