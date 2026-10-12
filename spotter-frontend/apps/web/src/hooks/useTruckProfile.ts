import { useEffect, useState } from 'react';
import type { TripAnalysis } from '@/services/api';
import { emptyTruckProfile, truckFields, type TruckProfileDraft } from '@/services/truck-profile';
export function useTruckProfile(analysis: TripAnalysis | null) {
  const [enabled, setEnabled] = useState(false);
  const [draft, setDraft] = useState<TruckProfileDraft>(emptyTruckProfile);
  useEffect(() => {
    if (!analysis?.snapshot?.restored) return;
    const profile = analysis.applied_request?.truck_profile;
    setEnabled(Boolean(profile));
    const next = emptyTruckProfile();
    if (profile) for (const field of truckFields) next[field.key] = String(profile[field.key]);
    setDraft(next);
  }, [analysis]);
  return {
    enabled,
    draft,
    formProps: { enabled, draft, onEnabled: setEnabled, onChange: setDraft },
  };
}
