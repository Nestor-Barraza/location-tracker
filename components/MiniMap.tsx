'use client';

import { useEffect, useState } from 'react';
import { Map, Marker } from 'react-map-gl/mapbox';
import 'mapbox-gl/dist/mapbox-gl.css';

interface Location {
  latitude: number;
  longitude: number;
  timestamp: number;
  accuracy?: number;
  date: string;
  time: string;
}

interface MiniMapProps {
  locations: Location[];
  selectedLocation?: Location | null;
  onLocationClick: (location: Location) => void;
  className?: string;
}

export default function MiniMap({ 
  locations, 
  selectedLocation, 
  onLocationClick,
  className = "w-full h-64"
}: MiniMapProps) {
  const [viewState, setViewState] = useState({
    longitude: -75.5575,
    latitude: 6.2174,
    zoom: 12
  });

  useEffect(() => {
    if (locations.length > 0) {
      const lats = locations.map(l => Number(l.latitude));
      const lngs = locations.map(l => Number(l.longitude));
      
      const minLat = Math.min(...lats);
      const maxLat = Math.max(...lats);
      const minLng = Math.min(...lngs);
      const maxLng = Math.max(...lngs);
      
      const centerLat = (minLat + maxLat) / 2;
      const centerLng = (minLng + maxLng) / 2;
      
      const latDiff = maxLat - minLat;
      const lngDiff = maxLng - minLng;
      const maxDiff = Math.max(latDiff, lngDiff);
      
      let zoom = 12;
      if (maxDiff > 0.1) zoom = 9;
      else if (maxDiff > 0.01) zoom = 11;
      else if (maxDiff > 0.001) zoom = 13;
      else zoom = 15;
      
      setViewState({
        longitude: centerLng,
        latitude: centerLat,
        zoom: zoom
      });
    }
  }, [locations]);

  useEffect(() => {
    if (selectedLocation) {
      setViewState(prev => ({
        ...prev,
        longitude: Number(selectedLocation.longitude),
        latitude: Number(selectedLocation.latitude),
        zoom: Math.max(prev.zoom, 14)
      }));
    }
  }, [selectedLocation]);

  if (locations.length === 0) {
    return (
      <div className={`${className} bg-gray-100 rounded-lg flex items-center justify-center border`}>
        <div className="text-center text-gray-500">
          <div className="text-4xl mb-2">🗺️</div>
          <p className="text-sm">No hay ubicaciones</p>
        </div>
      </div>
    );
  }

  return (
    <div className={`${className} bg-gray-800 rounded-lg overflow-hidden border relative`}>
      <Map
        {...viewState}
        onMove={evt => setViewState(evt.viewState)}
        style={{ width: '100%', height: '100%' }}
        mapboxAccessToken={process.env.NEXT_PUBLIC_MAPBOX_ACCESS_TOKEN}
        mapStyle="mapbox://styles/mapbox/streets-v11"
        attributionControl={false}
        interactive={true}
      >
        {locations.map((location, index) => {
          const isSelected = selectedLocation && 
            Number(selectedLocation.latitude) === Number(location.latitude) && 
            Number(selectedLocation.longitude) === Number(location.longitude) &&
            selectedLocation.timestamp === location.timestamp;
          
          const isLatest = index === locations.length - 1;
          
          return (
            <Marker
              key={`${location.latitude}-${location.longitude}-${location.timestamp}-${index}`}
              longitude={Number(location.longitude)}
              latitude={Number(location.latitude)}
              onClick={(e) => {
                e.originalEvent.stopPropagation();
                onLocationClick(location);
              }}
            >
              <div 
                className={`relative cursor-pointer transition-all duration-200 hover:scale-110 ${
                  isSelected ? 'scale-125 z-10' : ''
                }`}
                title={`${location.date} ${location.time}`}
              >
                <div 
                  className={`w-3 h-3 rounded-full border-2 border-white shadow-lg ${
                    isSelected 
                      ? 'bg-yellow-500 animate-pulse' 
                      : isLatest 
                        ? 'bg-red-500 animate-pulse' 
                        : 'bg-blue-500'
                  }`}
                >
                  {(isSelected || isLatest) && (
                    <div className="absolute inset-0 bg-current rounded-full animate-ping opacity-75"></div>
                  )}
                </div>
              </div>
            </Marker>
          );
        })}
      </Map>
      
      <div className="absolute top-2 left-2 bg-black/80 backdrop-blur-sm rounded px-2 py-1 text-white text-xs">
        {locations.length} ubicaciones
      </div>
      
      {selectedLocation && (
        <div className="absolute bottom-2 left-2 right-2 bg-black/90 backdrop-blur-sm rounded-lg p-3 text-white text-xs">
          <div className="font-semibold text-yellow-400 mb-1">Ubicación Seleccionada</div>
          <div className="grid grid-cols-2 gap-2 text-xs">
            <div>
              <span className="text-gray-400">Fecha:</span>
              <div className="text-white">{selectedLocation.date}</div>
            </div>
            <div>
              <span className="text-gray-400">Hora:</span>
              <div className="text-white">{selectedLocation.time}</div>
            </div>
            <div>
              <span className="text-gray-400">Lat:</span>
              <div className="text-green-400 font-mono">{Number(selectedLocation.latitude).toFixed(6)}</div>
            </div>
            <div>
              <span className="text-gray-400">Lng:</span>
              <div className="text-green-400 font-mono">{Number(selectedLocation.longitude).toFixed(6)}</div>
            </div>
          </div>
          {selectedLocation.accuracy && (
            <div className="mt-2 pt-2 border-t border-gray-600">
              <span className="text-gray-400">Precisión:</span>
              <span className="text-purple-400 ml-1">±{selectedLocation.accuracy}m</span>
            </div>
          )}
        </div>
      )}
    </div>
  );
}