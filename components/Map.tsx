'use client';

import { Location } from '../types/auth';
import { useEffect, useState } from 'react';
import { Map, Marker, Popup } from 'react-map-gl/mapbox';
import 'mapbox-gl/dist/mapbox-gl.css';

interface MapProps {
  locations: Location[];
  center?: [number, number];
  zoom?: number;
}

export default function MapComponent({ locations, center = [6.2174, -75.5575], zoom = 12 }: MapProps) {
  const [viewState, setViewState] = useState({
    longitude: center[1],
    latitude: center[0],
    zoom: zoom
  });
  
  const [selectedLocation, setSelectedLocation] = useState<Location | null>(null);
  const latestLocation = locations.length > 0 ? locations[locations.length - 1] : null;
  const uniqueUsers = new Set(locations.map(l => l.userId));

  useEffect(() => {
    setViewState(prev => ({
      ...prev,
      zoom: zoom
    }));
  }, [zoom]);

  useEffect(() => {
    if (latestLocation) {
      setViewState(prev => ({
        ...prev,
        longitude: latestLocation.longitude,
        latitude: latestLocation.latitude
      }));
    }
  }, [latestLocation]);

  return (
    <div className="h-full w-full bg-gray-800 rounded-lg relative overflow-hidden">
      {locations.length > 0 && (
        <div className="absolute top-3 left-3 z-[1000] bg-black/90 backdrop-blur-sm rounded-lg px-3 py-2 text-white text-sm border border-green-500/30">
          <div className="flex items-center space-x-3">
            <div className="flex items-center">
              <div className="w-2 h-2 bg-green-400 rounded-full mr-2 animate-pulse"></div>
              <span className="text-green-400 font-bold">LIVE</span>
            </div>
            <span className="text-white/90">{locations.length} ubicaciones</span>
            <span className="text-white/50">|</span>
            <span className="text-blue-400">{uniqueUsers.size} usuarios</span>
          </div>
        </div>
      )}

      {locations.length === 0 ? (
        <div className="h-full flex items-center justify-center">
          <div className="text-center text-white">
            <div className="text-6xl mb-4 animate-pulse">🗺️</div>
            <h3 className="text-xl font-bold mb-2">Esperando Ubicaciones</h3>
            <p className="text-white/70">Los dispositivos enviarán datos automáticamente</p>
            <div className="mt-4 text-sm text-white/50">
              Sistema de tracking 24/7 activo
            </div>
          </div>
        </div>
      ) : (
        <>
          <Map
            {...viewState}
            onMove={evt => setViewState(evt.viewState)}
            style={{ width: '100%', height: '100%' }}
            mapboxAccessToken={process.env.NEXT_PUBLIC_MAPBOX_ACCESS_TOKEN}
            mapStyle="mapbox://styles/mapbox/dark-v10"
            attributionControl={true}
          >
            {locations.map((location, index) => (
              <Marker
                key={`${location.userId}-${index}`}
                longitude={location.longitude}
                latitude={location.latitude}
                onClick={() => setSelectedLocation(location)}
              >
                <div className="relative cursor-pointer">
                  <div className="w-4 h-4 bg-red-500 rounded-full border-2 border-white shadow-lg animate-pulse">
                    <div className="absolute inset-0 bg-red-400 rounded-full animate-ping opacity-75"></div>
                  </div>
                </div>
              </Marker>
            ))}

            {selectedLocation && (
              <Popup
                longitude={selectedLocation.longitude}
                latitude={selectedLocation.latitude}
                onClose={() => setSelectedLocation(null)}
                closeButton={true}
                closeOnClick={false}
              >
                <div className="text-sm text-black">
                  <div className="font-bold">{selectedLocation.userId}</div>
                  <div className="text-xs mt-1">
                    <div>Lat: {selectedLocation.latitude.toFixed(6)}</div>
                    <div>Lng: {selectedLocation.longitude.toFixed(6)}</div>
                    <div>Hora: {selectedLocation.timestamp.toLocaleTimeString()}</div>
                    {selectedLocation.accuracy && (
                      <div>Precisión: ±{selectedLocation.accuracy.toFixed(0)}m</div>
                    )}
                  </div>
                </div>
              </Popup>
            )}
          </Map>

          <div className="absolute bottom-3 left-3 bg-black/90 backdrop-blur-sm rounded-lg p-4 text-white text-sm border border-white/10 max-w-sm">
            <div className="text-green-400 font-bold mb-2 flex items-center">
              <span className="text-lg mr-2">📍</span>
              Última Ubicación
            </div>
            {latestLocation && (
              <div className="space-y-1 text-xs">
                <p><span className="text-white/60">Usuario:</span> <span className="text-white font-medium">{latestLocation.userId}</span></p>
                <p><span className="text-white/60">Coordenadas:</span></p>
                <p className="text-yellow-400 font-mono ml-2">
                  {Number(latestLocation.latitude).toFixed(6)}<br/>
                  {Number(latestLocation.longitude).toFixed(6)}
                </p>
                <p><span className="text-white/60">Hora:</span> <span className="text-blue-400">{latestLocation.timestamp.toLocaleString()}</span></p>
                {latestLocation.accuracy && (
                  <p><span className="text-white/60">Precisión:</span> <span className="text-purple-400">±{Number(latestLocation.accuracy).toFixed(0)}m</span></p>
                )}
              </div>
            )}
            
            <div className="grid grid-cols-3 gap-2 mt-3 pt-2 border-t border-white/20">
              <div className="text-center">
                <div className="text-sm font-bold text-green-400">{locations.length}</div>
                <div className="text-xs text-white/60">Puntos</div>
              </div>
              <div className="text-center">
                <div className="text-sm font-bold text-blue-400">{uniqueUsers.size}</div>
                <div className="text-xs text-white/60">Usuarios</div>
              </div>
              <div className="text-center">
                <div className="text-sm font-bold text-purple-400">ON</div>
                <div className="text-xs text-white/60">Estado</div>
              </div>
            </div>
          </div>
        </>
      )}
    </div>
  );
}