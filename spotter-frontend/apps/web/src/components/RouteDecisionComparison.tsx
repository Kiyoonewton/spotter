import Accordion from '@mui/material/Accordion';
import AccordionSummary from '@mui/material/AccordionSummary';
import AccordionDetails from '@mui/material/AccordionDetails';
import Table from '@mui/material/Table';
import TableBody from '@mui/material/TableBody';
import TableCell from '@mui/material/TableCell';
import TableContainer from '@mui/material/TableContainer';
import TableHead from '@mui/material/TableHead';
import TableRow from '@mui/material/TableRow';
import Typography from '@mui/material/Typography';
import ExpandMoreIcon from '@mui/icons-material/ExpandMoreRounded';
import { decisionCriteria, explainRouteDecision } from '@/lib/route-decision';
import { formatMeasurement } from '@/lib/result-presentation';
import type { RouteView } from './RouteCard';

type Props = { routes: RouteView[]; recommended: string | null };
const label = (route: RouteView) => `Route ${route.displayId ?? route.id}`;

export function RouteDecisionComparison({ routes, recommended }: Props) {
  if (!routes.length) return null;
  const decision = explainRouteDecision(routes, recommended);
  const criterion = decisionCriteria.find(({ key }) => key === decision?.deciding);
  let explanation =
    'No route is recommended by this analysis. Blocked and incomplete routes are excluded from eligible ranking.';
  if (decision) {
    explanation = !decision.consistent
      ? 'The API recommendation differs from the displayed metric order. Inspect the returned explanation; no replacement recommendation has been made.'
      : !decision.runnerUp
        ? `${label(decision.winner)} is the only eligible route. Other routes cannot compete while blocked or incomplete.`
        : criterion
          ? `${criterion.label} decides the comparison with the next eligible route, ${label(decision.runnerUp)}. Earlier criteria are tied.`
          : 'All four criteria are tied. The stable route ID resolves the tie.';
  }
  return (
    <Accordion
      disableGutters
      elevation={0}
      sx={{
        border: '1px solid',
        borderColor: 'divider',
        borderRadius: 2,
        my: 1.5,
        '&::before': { display: 'none' },
      }}
    >
      <AccordionSummary expandIcon={<ExpandMoreIcon />}>
        <Typography component="h4" sx={{ fontWeight: 700 }}>
          Why this route?
        </Typography>
      </AccordionSummary>
      <AccordionDetails sx={{ px: 1.5, pt: 0 }}>
        <Typography variant="body2" sx={{ mb: 1.5 }}>
          {explanation}
        </Typography>
        <TableContainer
          tabIndex={0}
          role="region"
          aria-label="Route decision metrics; scroll horizontally to compare alternatives"
          sx={{ maxWidth: '100%', overflowX: 'auto' }}
        >
          <Table
            size="small"
            aria-label="Recommendation criteria in priority order"
            sx={{ minWidth: 430 }}
          >
            <TableHead>
              <TableRow>
                <TableCell component="th" scope="col">
                  Priority
                </TableCell>
                {routes.map((route) => (
                  <TableCell key={route.id} component="th" scope="col">
                    {label(route)}
                  </TableCell>
                ))}
              </TableRow>
            </TableHead>
            <TableBody>
              <TableRow>
                <TableCell component="th" scope="row">
                  Eligibility
                </TableCell>
                {routes.map((route) => (
                  <TableCell key={route.id}>
                    {route.eligibility === 'eligible'
                      ? 'Eligible'
                      : route.eligibility === 'blocked'
                        ? 'Blocked'
                        : 'Incomplete'}
                  </TableCell>
                ))}
              </TableRow>
              {decisionCriteria.map(({ key, label: name, unit }, index) => (
                <TableRow
                  key={key}
                  sx={decision?.deciding === key ? { backgroundColor: 'action.selected' } : {}}
                >
                  <TableCell component="th" scope="row">
                    {index + 1}. {name}
                    {decision?.deciding === key && (
                      <Typography component="span" variant="caption" sx={{ display: 'block' }}>
                        Deciding criterion
                      </Typography>
                    )}
                  </TableCell>
                  {routes.map((route) => (
                    <TableCell key={route.id} sx={{ fontVariantNumeric: 'tabular-nums' }}>
                      {route[key] == null
                        ? 'Unavailable'
                        : `${formatMeasurement(route[key])} ${unit}`}
                    </TableCell>
                  ))}
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </TableContainer>
        {decision?.fastest && (
          <Typography variant="body2" sx={{ mt: 1.5 }}>
            Compared with the fastest eligible option, {label(decision.fastest)}:{' '}
            {decision.extraMinutes === 0
              ? 'no additional driving time'
              : `${formatMeasurement(decision.extraMinutes)} extra driving minutes`}
            ;{' '}
            {decision.distanceDifference === 0
              ? 'the same distance'
              : `${formatMeasurement(Math.abs(decision.distanceDifference))} ${decision.distanceDifference > 0 ? 'more' : 'fewer'} miles`}
            .
          </Typography>
        )}
        <Typography variant="caption" component="p" sx={{ mt: 1, color: 'text.secondary' }}>
          Ranking uses unrounded API values; displayed measurements are rounded. Criteria are
          applied in order, not combined into a new score. Only the API can recommend a route.
          Selecting a route or weather time does not change the decision.
        </Typography>
      </AccordionDetails>
    </Accordion>
  );
}
