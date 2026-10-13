import { useEffect, useState } from 'react';
import Accordion from '@mui/material/Accordion';
import AccordionSummary from '@mui/material/AccordionSummary';
import AccordionDetails from '@mui/material/AccordionDetails';
import FormControlLabel from '@mui/material/FormControlLabel';
import Checkbox from '@mui/material/Checkbox';
import TextField from '@mui/material/TextField';
import Box from '@mui/material/Box';
import Typography from '@mui/material/Typography';
import ExpandMoreIcon from '@mui/icons-material/ExpandMoreRounded';
import LocalShippingIcon from '@mui/icons-material/LocalShippingOutlined';
import { truckFields, type TruckProfileDraft } from '@/services/truck-profile';
type Props = {
  analysisId: string | undefined;
  mode: 'demo' | 'live';
  pending: boolean;
  enabled: boolean;
  draft: TruckProfileDraft;
  onEnabled: (value: boolean) => void;
  onChange: (value: TruckProfileDraft) => void;
};
export function TruckProfileForm(props: Props) {
  const live = props.mode === 'live';
  const [expanded, setExpanded] = useState(false);
  useEffect(() => setExpanded(false), [props.analysisId]);
  return (
    <Accordion
      expanded={expanded}
      onChange={(_, value) => setExpanded(value)}
      disableGutters
      sx={{ my: 2, borderRadius: 2, border: '1px solid #dbe5e0', '&:before': { display: 'none' } }}
    >
      <AccordionSummary expandIcon={<ExpandMoreIcon />}>
        <LocalShippingIcon sx={{ mr: 1, color: 'primary.main' }} />
        <Typography>
          Truck profile · {live && props.enabled ? 'Entered measurements' : 'Not configured'}
        </Typography>
      </AccordionSummary>
      <AccordionDetails>
        <Typography variant="body2" sx={{ mb: 1 }}>
          Include the truck and all trailers. Cargo weight above controls weather risk; these
          measurements control routing. No measurements are guessed.
        </Typography>
        <FormControlLabel
          control={
            <Checkbox
              checked={live && props.enabled}
              disabled={!live || props.pending}
              onChange={(_, value) => props.onEnabled(value)}
            />
          }
          label="Use physical vehicle measurements for live routing"
        />
        {!live ? (
          <Typography variant="body2">Demo routes do not apply vehicle restrictions.</Typography>
        ) : props.enabled ? (
          <Box
            sx={{
              display: 'grid',
              gridTemplateColumns: {
                xs: 'minmax(0, 1fr)',
                sm: 'repeat(2, minmax(0, 1fr))',
                md: 'repeat(3, minmax(0, 1fr))',
              },
              gap: 2,
              mt: 2,
            }}
          >
            {truckFields.map((field) => (
              <TextField
                key={field.key}
                label={`${field.label} (${field.unit})`}
                type="number"
                value={props.draft[field.key]}
                disabled={props.pending}
                onChange={(event) =>
                  props.onChange({ ...props.draft, [field.key]: event.target.value })
                }
                slotProps={{ htmlInput: { min: 0.01, max: field.max, step: 'any' } }}
                helperText={
                  field.key === 'current_weight_lb'
                    ? 'Truck + trailers + current cargo'
                    : field.key === 'gross_weight_lb'
                      ? 'Vehicle combination loaded at rated capacity'
                      : field.key === 'weight_per_axle_lb'
                        ? 'Heaviest loaded axle, not the axle-group total'
                        : 'Overall vehicle combination'
                }
              />
            ))}
          </Box>
        ) : (
          <Typography variant="body2">
            HERE truck defaults are used. Vehicle clearance and weight suitability are not
            established.
          </Typography>
        )}
        <Typography variant="caption" component="p" sx={{ mt: 2 }}>
          Provider road data may be incomplete. Permits, hazardous goods, axle groups and driver
          hours are not checked.
        </Typography>
      </AccordionDetails>
    </Accordion>
  );
}
