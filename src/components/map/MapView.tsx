import React, { useRef, useState, useEffect } from 'react';
import { MapContainer, TileLayer, Marker, Popup, useMap } from 'react-leaflet';
import L from 'leaflet';
import { RoadDamage } from '@/types';
import DamageCard from '@/components/damage/DamageCard';
import { useTheme } from '@/components/theme/ThemeProvider';
import { resolveAndStoreCaptureAddress } from '@/services/captures';
import { Crosshair, MapPin } from 'lucide-react';
import 'leaflet/dist/leaflet.css';

interface MapViewProps {
  damages: RoadDamage[];
  focusedLocation?: {
    lat: number;
    lng: number;
    label: string;
  } | null;
  reportNavigationState?: {
    returnView: 'map' | 'list';
    reportIds: string[];
  };
}

const osmTileLayer = {
  url: 'https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png',
  attribution: '&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors',
};

// Custom marker icons based on status
const markerIconCache = new Map<string, L.DivIcon>();

const createMarkerIcon = (status: string) => {
  const cached = markerIconCache.get(status);
  if (cached) return cached;

  const colors: Record<string, string> = {
    urgent: '#ef4444',
    pending: '#f59e0b',
    'in-progress': '#3b82f6',
    completed: '#22c55e',
  };
  
  const color = colors[status] || '#3b82f6';
  
  const icon = L.divIcon({
    className: 'custom-marker',
    html: `
      <div style="
        width: 32px;
        height: 32px;
        background: ${color};
        border-radius: 50%;
        border: 3px solid white;
        box-shadow: 0 2px 8px rgba(0,0,0,0.3);
        display: flex;
        align-items: center;
        justify-content: center;
        color: white;
        font-weight: bold;
        font-size: 10px;
      ">
        <svg xmlns="http://www.w3.org/2000/svg" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
          <path d="M20 10c0 6-8 12-8 12s-8-6-8-12a8 8 0 0 1 16 0Z"/>
          <circle cx="12" cy="10" r="3"/>
        </svg>
      </div>
    `,
    iconSize: [32, 32],
    iconAnchor: [16, 32],
    popupAnchor: [0, -32],
  });

  markerIconCache.set(status, icon);
  return icon;
};

// Component to recenter map when damages change
function fitMapToDamages(map: L.Map, damages: RoadDamage[]) {
  if (damages.length === 0) return;

  const bounds = L.latLngBounds(
    damages.map(d => [d.location.lat, d.location.lng])
  );
  map.fitBounds(bounds, { padding: [50, 50] });
}

const MapController: React.FC<{
  damages: RoadDamage[];
  focusedLocation?: MapViewProps['focusedLocation'];
  recenterRequestId: number;
}> = ({ damages, focusedLocation, recenterRequestId }) => {
  const map = useMap();
  const fittedMarkerSignatureRef = useRef<string | null>(null);
  const focusedLocationSignatureRef = useRef<string | null>(null);
  const recenterRequestRef = useRef(0);

  useEffect(() => {
    if (!focusedLocation) return;

    const signature = `${focusedLocation.lat.toFixed(6)},${focusedLocation.lng.toFixed(6)}`;
    if (focusedLocationSignatureRef.current === signature) return;

    focusedLocationSignatureRef.current = signature;
    map.flyTo([focusedLocation.lat, focusedLocation.lng], 15, { duration: 0.8 });
  }, [focusedLocation, map]);

  useEffect(() => {
    if (recenterRequestId === recenterRequestRef.current) return;

    recenterRequestRef.current = recenterRequestId;
    focusedLocationSignatureRef.current = null;
    fitMapToDamages(map, damages);
  }, [damages, map, recenterRequestId]);
  
  useEffect(() => {
    if (damages.length === 0) return;
    if (focusedLocation) return;

    const markerSignature = damages
      .map((damage) => `${damage.id}:${damage.location.lat},${damage.location.lng}`)
      .sort()
      .join('|');

    if (fittedMarkerSignatureRef.current === markerSignature) {
      return;
    }

    fittedMarkerSignatureRef.current = markerSignature;

    fitMapToDamages(map, damages);
  }, [damages, focusedLocation, map]);
  
  return null;
};

const MapView: React.FC<MapViewProps> = ({ damages, focusedLocation, reportNavigationState }) => {
  const { resolvedTheme } = useTheme();
  const [selectedDamage, setSelectedDamage] = useState<RoadDamage | null>(null);
  const [locationNames, setLocationNames] = useState<Record<string, string>>({});
  const [recenterRequestId, setRecenterRequestId] = useState(0);

  // Default center (New York City area)
  const defaultCenter: [number, number] = [40.7128, -74.006];
  const defaultZoom = 12;
  const isCoordinateLabel = (value: string) => /^-?\d+(\.\d+)?,\s*-?\d+(\.\d+)?$/.test(value.trim());

  const handleMarkerClick = (damage: RoadDamage) => {
    setSelectedDamage(damage);

    if (locationNames[damage.id] || !isCoordinateLabel(damage.location.address)) return;

    resolveAndStoreCaptureAddress(damage.id, damage.location.lat, damage.location.lng).then((locationName) => {
      setLocationNames((current) => ({
        ...current,
        [damage.id]: locationName,
      }));
    }).catch((error) => {
      console.warn(`Failed to resolve location for ${damage.id}.`, error);
    });
  };

  if (damages.length === 0 && !focusedLocation) {
    return (
      <div className="road-map-shell relative flex h-full min-h-[500px] w-full items-center justify-center overflow-hidden bg-muted/30">
        <div className="text-center text-muted-foreground dark:text-[hsl(42_18%_86%)]">
          <MapPin className="w-12 h-12 mx-auto mb-4 text-primary opacity-70" />
          <p className="text-lg font-medium text-foreground dark:text-[hsl(45_18%_98%)]">No damage reports to display</p>
          <p className="text-sm">Try adjusting your filters</p>
        </div>
      </div>
    );
  }

  return (
    <div className="road-map-shell relative h-full min-h-[500px] w-full overflow-hidden">
      <style>{`
        .custom-marker {
          background: transparent !important;
          border: none !important;
        }
        .leaflet-container {
          background: hsl(var(--background));
        }
        .dark .road-map-shell .leaflet-tile {
          filter: invert(1) hue-rotate(180deg) brightness(0.82) contrast(1.22) saturate(0.78);
        }
        .leaflet-popup-content-wrapper {
          padding: 0;
          border-radius: 12px;
          overflow: hidden;
          background: hsl(var(--card));
          color: hsl(var(--card-foreground));
          border: 1px solid hsl(var(--border));
        }
        .leaflet-popup-content {
          margin: 0;
          min-width: 280px;
        }
        .leaflet-popup-tip {
          background: hsl(var(--card));
          border: 1px solid hsl(var(--border));
        }
        .leaflet-popup-close-button {
          display: none;
        }
        .leaflet-control-attribution {
          background: hsl(var(--card) / 0.88) !important;
          color: hsl(var(--muted-foreground)) !important;
        }
        .leaflet-control-attribution a {
          color: hsl(var(--primary)) !important;
        }
        .dark .road-map-shell .leaflet-popup-content-wrapper {
          color: hsl(45 18% 98%);
        }
        .dark .road-map-shell .leaflet-popup-content .text-muted-foreground {
          color: hsl(42 18% 86%) !important;
        }
        .dark .road-map-shell .leaflet-popup-content .font-semibold,
        .dark .road-map-shell .leaflet-popup-content .font-medium,
        .dark .road-map-shell .leaflet-popup-content .text-foreground {
          color: hsl(45 18% 98%) !important;
        }
        .dark .road-map-shell .map-floating-panel {
          color: hsl(45 18% 98%);
        }
        .dark .road-map-shell .map-floating-panel .text-muted-foreground {
          color: hsl(42 18% 86%) !important;
        }
      `}</style>
      
      <MapContainer
        center={defaultCenter}
        zoom={defaultZoom}
        className="h-full min-h-[500px] w-full"
        style={{ zIndex: 0 }}
      >
        <TileLayer
          key={resolvedTheme}
          attribution={osmTileLayer.attribution}
          url={osmTileLayer.url}
        />
        
        <MapController
          damages={damages}
          focusedLocation={focusedLocation}
          recenterRequestId={recenterRequestId}
        />
        
        {damages.map((damage) => (
          <Marker
            key={damage.id}
            position={[damage.location.lat, damage.location.lng]}
            icon={createMarkerIcon(damage.status)}
            eventHandlers={{
              click: () => handleMarkerClick(damage),
            }}
          >
            <Popup>
              <DamageCard
                damage={damage}
                compact
                showImage={false}
                reportNavigationState={reportNavigationState}
                locationLabel={
                  locationNames[damage.id] ??
                  (selectedDamage?.id === damage.id ? 'Resolving location...' : damage.location.address)
                }
              />
            </Popup>
          </Marker>
        ))}
      </MapContainer>

      {/* Map legend */}
      <div className="map-floating-panel absolute bottom-4 left-4 bg-card/95 backdrop-blur-sm rounded-lg p-3 shadow-lg z-[1000]">
        <p className="text-xs font-medium mb-2 text-muted-foreground">Legend</p>
        <div className="space-y-1.5">
          <div className="flex items-center gap-2">
            <div className="w-3 h-3 rounded-full bg-status-urgent" />
            <span className="text-xs">Urgent</span>
          </div>
          <div className="flex items-center gap-2">
            <div className="w-3 h-3 rounded-full bg-status-pending" />
            <span className="text-xs">Pending</span>
          </div>
          <div className="flex items-center gap-2">
            <div className="w-3 h-3 rounded-full bg-status-in-progress" />
            <span className="text-xs">In Progress</span>
          </div>
          <div className="flex items-center gap-2">
            <div className="w-3 h-3 rounded-full bg-status-completed" />
            <span className="text-xs">Completed</span>
          </div>
        </div>
      </div>

      {/* Info panel */}
      <div className="map-floating-panel absolute top-4 right-4 bg-card/95 backdrop-blur-sm rounded-lg p-3 shadow-lg z-[99]">
        <p className="text-sm font-medium">{damages.length} Reports</p>
        <p className="text-xs text-muted-foreground">
          {focusedLocation ? `Viewing ${focusedLocation.label}` : 'Click a marker for details'}
        </p>
      </div>

      <button
        type="button"
        className="map-floating-panel absolute bottom-4 right-4 z-[1000] inline-flex h-10 w-10 items-center justify-center rounded-lg border bg-card/95 text-primary shadow-lg backdrop-blur-sm transition-colors hover:bg-accent disabled:cursor-not-allowed disabled:opacity-50"
        onClick={() => setRecenterRequestId((current) => current + 1)}
        disabled={damages.length === 0}
        title="Recenter to reports"
        aria-label="Recenter map to reports"
      >
        <Crosshair className="h-5 w-5" />
      </button>
    </div>
  );
};

export default MapView;
