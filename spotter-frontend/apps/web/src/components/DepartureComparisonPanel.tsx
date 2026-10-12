import { useState } from 'react';
import Typography from '@mui/material/Typography';
import ScheduleIcon from '@mui/icons-material/ScheduleOutlined';
import Button from '@mui/material/Button';
import Alert from '@mui/material/Alert';
import LinearProgress from '@mui/material/LinearProgress';
import TableContainer from '@mui/material/TableContainer';
import Table from '@mui/material/Table';
import TableHead from '@mui/material/TableHead';
import TableBody from '@mui/material/TableBody';
import TableCell from '@mui/material/TableCell';
import TableRow from '@mui/material/TableRow';
import type { TripAnalysis } from '@/services/api';
import type { DepartureWindow } from '@/services/departure-comparison';
import { useDepartureComparison } from '@/hooks/useDepartureComparison';
import { presentRoutes, formatMeasurement } from '@/lib/result-presentation';
import { DepartureScenarioDialog } from './DepartureScenarioDialog';

export function DepartureComparisonPanel({ analysis }: { analysis: TripAnalysis }) {
  const { data, pending, error, compare } = useDepartureComparison(analysis);
  const [selection, setSelection] = useState<{ window: DepartureWindow; routeId: string } | null>(
    null,
  );
  const routes = presentRoutes(analysis);
  const timezone = analysis.applied_request?.departure_timezone ?? 'UTC';
  const date = (value: string) =>
    new Intl.DateTimeFormat('en-US', {
      month: 'short',
      day: 'numeric',
      hour: 'numeric',
      minute: '2-digit',
      timeZone: timezone,
    }).format(new Date(value));
  const best = data?.best_choice;
  const bestRoute = routes.find((route) => route.id === best?.route_id);
  return (
    <section
      className="departure-comparison-panel"
      aria-label="Route and departure comparison"
      style={{
        gridColumn: '1 / -1',
        minWidth: 0,
        padding: 16,
        borderRadius: 12,
        background: '#fff',
        border: '1px solid #dbe5e0',
      }}
    >
      <Typography component="h3" variant="h6" sx={{ fontWeight: 700, color: 'text.primary' }}>
        Route × Departure
      </Typography>
      <p>
        Compare weather at the planned departure, +2h, +4h and +6h on saved routes. Original results
        stay unchanged.
      </p>
      <Button variant="outlined" disabled={pending} onClick={() => void compare()}>
        {data ? 'Refresh departure comparison' : 'Compare departure windows'}
      </Button>
      {pending && <LinearProgress aria-label="Loading departure comparison" />}
      {error && <Alert severity="warning">{error}</Alert>}
      {data && (
        <>
          <Alert severity={best ? 'info' : 'warning'} sx={{ my: 1 }}>
            {best && bestRoute
              ? `Best eligible scenario: Route ${bestRoute.displayId ?? bestRoute.id}, departing +${best.offset_hours}h (${date(data.windows.find((window) => window.offset_hours === best.offset_hours)!.departure_at)} ${timezone}).`
              : 'No eligible option in the compared windows. Blocked and incomplete routes cannot win.'}
            {best?.arrival_delay_minutes != null
              ? ` Arrival difference versus this comparison’s baseline winner: ${formatMeasurement(best.arrival_delay_minutes)} min; Severe miles reduction: ${formatMeasurement(best.severe_miles_reduction ?? 0)} mi; High miles reduction: ${formatMeasurement(best.high_miles_reduction ?? 0)} mi; average risk improvement: ${formatMeasurement(best.average_risk_reduction ?? 0)} points.`
              : best
                ? ' There is no eligible baseline winner to quantify a risk reduction or arrival delay.'
                : ''}
          </Alert>
          <TableContainer
            tabIndex={0}
            role="region"
            aria-label="Departure comparison table; scroll sideways for more windows"
            sx={{ overflowX: 'auto', maxWidth: '100%' }}
          >
            <Table
              size="small"
              aria-label="Route by departure weather scenarios"
              sx={{ minWidth: 800 }}
            >
              <TableHead>
                <TableRow>
                  <TableCell>Route</TableCell>
                  {data.windows.map((window) => (
                    <TableCell key={window.offset_hours}>
                      +{window.offset_hours}h<br />
                      {date(window.departure_at)}
                      <br />
                      {timezone}
                    </TableCell>
                  ))}
                </TableRow>
              </TableHead>
              <TableBody>
                {routes.map((route) => (
                  <TableRow key={route.id}>
                    <TableCell component="th" scope="row">
                      Route {route.displayId ?? route.id}
                    </TableCell>
                    {data.windows.map((window) => {
                      const cell = window.routes.find((candidate) => candidate.id === route.id);
                      if (!cell)
                        return <TableCell key={window.offset_hours}>Unavailable</TableCell>;
                      const chosen =
                        best?.route_id === route.id && best.offset_hours === window.offset_hours;
                      return (
                        <TableCell
                          key={window.offset_hours}
                          sx={chosen ? { backgroundColor: 'action.selected' } : {}}
                        >
                          <strong>{cell.eligibility}</strong>
                          <br />
                          Severe {formatMeasurement(cell.risk_miles['Severe'] ?? 0)} mi · High{' '}
                          {formatMeasurement(cell.risk_miles['High'] ?? 0)} mi
                          <br />
                          Average{' '}
                          {cell.eligibility !== 'eligible' || cell.average_risk == null
                            ? 'Unavailable'
                            : cell.average_risk.toFixed(1)}{' '}
                          · Risk coverage {formatMeasurement(cell.forecast_coverage_percent)}%<br />
                          Arrival {date(cell.arrival_at)}
                          <br />
                          {chosen ? (
                            <strong>
                              Best compared option
                              <br />
                            </strong>
                          ) : window.recommended_route_id === route.id ? (
                            <span>
                              Best in this window
                              <br />
                            </span>
                          ) : null}
                          <Button
                            size="small"
                            aria-label={`Inspect Route ${route.displayId ?? route.id} at +${window.offset_hours}h`}
                            onClick={() => setSelection({ window, routeId: route.id })}
                          >
                            Inspect scenario
                          </Button>
                        </TableCell>
                      );
                    })}
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </TableContainer>
          <p>
            Scroll sideways to compare all windows. {data.notice} {data.forecast_notice}
          </p>
          <small>
            {data.ranking_policy} · Calculated {date(data.computed_at)} {timezone}
            {data.retrieved_at ? ` · Weather retrieved ${date(data.retrieved_at)} ${timezone}` : ''}
            .
          </small>
        </>
      )}
      {selection && (
        <DepartureScenarioDialog
          key={`${selection.routeId}:${selection.window.offset_hours}`}
          original={analysis}
          window={selection.window}
          selected={selection.routeId}
          onClose={() => setSelection(null)}
        />
      )}
    </section>
  );
}
