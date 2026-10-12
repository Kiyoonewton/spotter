import Button from '@mui/material/Button';
import Chip from '@mui/material/Chip';
import ArrowRightIcon from '@mui/icons-material/ArrowForwardRounded';
import InfoIcon from '@mui/icons-material/InfoOutlined';
import ShieldIcon from '@mui/icons-material/GppGoodOutlined';
import WarningIcon from '@mui/icons-material/WarningAmberRounded';

type Props = {
  status: 'loading' | 'recommended' | 'blocked' | 'incomplete' | 'error';
  recommendedRouteId: string | null;
  recommendedRouteLabel?: string | undefined;
  explanation: string;
  onChangeDeparture: () => void;
};

const sx = (fontSize: number) => ({ fontSize });

export function RecommendationBanner({
  status,
  recommendedRouteId,
  recommendedRouteLabel,
  explanation,
  onChangeDeparture,
}: Props) {
  const blocked = status === 'blocked';
  const incomplete = status === 'incomplete';
  const loading = status === 'loading';
  const error = status === 'error';
  const title = loading
    ? 'Finding your best corridor…'
    : blocked
      ? 'All routes blocked'
      : incomplete
        ? 'Recommendation unavailable — incomplete forecast'
        : error
          ? 'Trip analysis unavailable'
          : `Route ${recommendedRouteLabel ?? recommendedRouteId ?? '—'} recommended`;
  return (
    <div
      className={`recommendation ${blocked ? 'recommendation-blocked' : incomplete ? 'recommendation-missing' : ''}`}
      role="status"
      aria-live="polite"
    >
      <span className="recommendation-icon">
        {blocked || error ? (
          <WarningIcon sx={sx(22)} />
        ) : incomplete ? (
          <InfoIcon sx={sx(22)} />
        ) : (
          <ShieldIcon sx={sx(22)} />
        )}
      </span>
      <div>
        <strong>{title}</strong>
        <p>
          {loading
            ? 'Calculating checkpoint arrival times and comparing weather exposure.'
            : explanation}
        </p>
      </div>
      {blocked ? (
        <Button variant="outlined" endIcon={<ArrowRightIcon />} onClick={onChangeDeparture}>
          Change departure time
        </Button>
      ) : (
        <Chip
          sx={{ ml: 'auto' }}
          size="small"
          color={incomplete || error ? 'default' : 'success'}
          label={
            incomplete
              ? 'FORECAST GAP'
              : error
                ? 'ERROR'
                : loading
                  ? 'ANALYZING'
                  : 'LOWEST WEATHER EXPOSURE'
          }
        />
      )}
    </div>
  );
}
