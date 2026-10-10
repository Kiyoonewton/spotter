import { Layers, MapPin } from 'lucide-react';

export function MapAttribution() {
  return (
    <>
      <div className="map-top-label">
        <MapPin size={14} /> Midwest corridor <span>Illustrative map</span>
      </div>
      <div className="map-scale">
        <span />
        50 mi
      </div>
      <div className="map-attribution">
        <Layers size={12} /> Illustrative geography · Not for navigation
      </div>
    </>
  );
}
