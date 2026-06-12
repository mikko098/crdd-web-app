import React, { useState, useEffect } from 'react';
import { MapContainer, TileLayer, Marker, Popup, useMap } from 'react-leaflet';
import L from 'leaflet';
import { RoadDamage } from '@/types';
import DamageCard from '@/components/damage/DamageCard';
import { MapPin } from 'lucide-react';
import 'leaflet/dist/leaflet.css';

interface MapViewProps {
  damages: RoadDamage[];
}

// Custom marker icons based on status
const createMarkerIcon = (status: string) => {
  const colors: Record<string, string> = {
    urgent: '#ef4444',
    pending: '#f59e0b',
    'in-progress': '#3b82f6',
    completed: '#22c55e',
  };
  
  const color = colors[status] || '#3b82f6';
  
  return L.divIcon({
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
};

// Component to recenter map when damages change
const MapController: React.FC<{ damages: RoadDamage[] }> = ({ damages }) => {
  const map = useMap();
  
  useEffect(() => {
    if (damages.length > 0) {
      const bounds = L.latLngBounds(
        damages.map(d => [d.location.lat, d.location.lng])
      );
      map.fitBounds(bounds, { padding: [50, 50] });
    }
  }, [damages, map]);
  
  return null;
};

const MapView: React.FC<MapViewProps> = ({ damages }) => {
  const [selectedDamage, setSelectedDamage] = useState<RoadDamage | null>(null);

  // Default center (New York City area)
  const defaultCenter: [number, number] = [40.7128, -74.006];
  const defaultZoom = 12;

  if (damages.length === 0) {
    return (
      <div className="relative w-full h-full min-h-[500px] bg-muted/30 rounded-lg overflow-hidden flex items-center justify-center">
        <div className="text-center text-muted-foreground">
          <MapPin className="w-12 h-12 mx-auto mb-4 opacity-50" />
          <p className="text-lg font-medium">No damage reports to display</p>
          <p className="text-sm">Try adjusting your filters</p>
        </div>
      </div>
    );
  }

  return (
    <div className="relative w-full h-full min-h-[500px] rounded-lg overflow-hidden">
      <style>{`
        .custom-marker {
          background: transparent !important;
          border: none !important;
        }
        .leaflet-popup-content-wrapper {
          padding: 0;
          border-radius: 12px;
          overflow: hidden;
        }
        .leaflet-popup-content {
          margin: 0;
          min-width: 280px;
        }
        .leaflet-popup-close-button {
          display: none;
        }
      `}</style>
      
      <MapContainer
        center={defaultCenter}
        zoom={defaultZoom}
        className="w-full h-full min-h-[500px]"
        style={{ zIndex: 0 }}
      >
        <TileLayer
          attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors'
          url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
        />
        
        <MapController damages={damages} />
        
        {damages.map((damage) => (
          <Marker
            key={damage.id}
            position={[damage.location.lat, damage.location.lng]}
            icon={createMarkerIcon(damage.status)}
            eventHandlers={{
              click: () => setSelectedDamage(damage),
            }}
          >
            <Popup>
              <DamageCard damage={damage} compact />
            </Popup>
          </Marker>
        ))}
      </MapContainer>

      {/* Map legend */}
      <div className="absolute bottom-4 left-4 bg-card/95 backdrop-blur-sm rounded-lg p-3 shadow-lg z-[1000]">
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
      <div className="absolute top-4 right-4 bg-card/95 backdrop-blur-sm rounded-lg p-3 shadow-lg z-[99]">
        <p className="text-sm font-medium">{damages.length} Reports</p>
        <p className="text-xs text-muted-foreground">Click a marker for details</p>
      </div>
    </div>
  );
};

export default MapView;
