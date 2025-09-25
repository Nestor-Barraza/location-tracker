'use client';

import { useState } from 'react';
import dynamic from 'next/dynamic';
import { useAuth } from '../context/AuthContext';
import RealTimeTracker from './RealTimeTracker';
import { FiMap, FiActivity, FiInfo, FiAlertTriangle, FiCheckCircle } from 'react-icons/fi';

const Map = dynamic(() => import('./Map'), {
  ssr: false,
  loading: () => <div className="h-full bg-black/20 rounded-lg animate-pulse" />
});

export default function UserDashboard() {
  const { user } = useAuth();
  const [currentLocation, setCurrentLocation] = useState<GeolocationPosition | null>(null);
  const [error, setError] = useState<string | null>(null);

  const getCurrentLocation = () => {
    if (!navigator.geolocation) {
      setError('La geolocalización no está soportada');
      return;
    }

    navigator.geolocation.getCurrentPosition(
      (position) => {
        setCurrentLocation(position);
        setError(null);
      },
      (err) => {
        setError(err.message);
      },
      {
        enableHighAccuracy: true,
        timeout: 10000,
        maximumAge: 60000,
      }
    );
  };

  return (
    <div className="container mx-auto p-4 sm:p-6 lg:p-8 text-white">
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <div className="lg:col-span-1 space-y-6">
          <RealTimeTracker />
          
          <div className="bg-black/20 backdrop-blur-lg rounded-2xl shadow-2xl border border-white/10 p-6">
            <h2 className="text-xl font-semibold mb-4 flex items-center"><FiActivity className="mr-3 text-purple-400"/>Controles Manuales</h2>
            
            <div className="space-y-2">
              <button
                onClick={getCurrentLocation}
                className="w-full bg-purple-500/50 hover:bg-purple-500/70 text-white px-4 py-3 rounded-lg font-semibold transition-all duration-200 flex items-center justify-center"
              >
                Obtener Ubicación Actual
              </button>
            </div>

            {error && (
              <div className="mt-4 p-3 bg-red-500/50 border border-red-400/50 rounded-lg flex items-center">
                <FiAlertTriangle className="mr-3"/> {error}
              </div>
            )}

            {currentLocation && (
              <div className="mt-4 p-4 bg-green-500/50 border border-green-400/50 rounded-lg">
                <p className="font-semibold flex items-center"><FiCheckCircle className="mr-2"/>Posición Actual:</p>
                <p className="text-sm mt-2">Lat: {currentLocation.coords.latitude.toFixed(6)}</p>
                <p className="text-sm">Lng: {currentLocation.coords.longitude.toFixed(6)}</p>
                <p className="text-sm">Precisión: {currentLocation.coords.accuracy?.toFixed(0)}m</p>
              </div>
            )}
          </div>

          <div className="bg-black/20 backdrop-blur-lg rounded-2xl shadow-2xl border border-white/10 p-6">
            <h3 className="text-lg font-semibold mb-4 flex items-center"><FiInfo className="mr-3 text-purple-400"/>Estado de Conexión</h3>
            <div className="p-3 bg-black/20 rounded-lg">
              <div className="flex items-center space-x-3">
                <div className="w-3 h-3 bg-green-400 rounded-full animate-pulse"></div>
                <span className="text-sm text-white/80">
                  Tu ubicación se comparte en tiempo real.
                </span>
              </div>
            </div>
          </div>
        </div>

        <div className="lg:col-span-2 bg-black/20 backdrop-blur-lg rounded-2xl shadow-2xl border border-white/10 p-6 min-h-[400px] lg:min-h-0">
          <h3 className="text-xl font-semibold mb-4 flex items-center"><FiMap className="mr-3 text-purple-400"/>Ubicación en Mapa</h3>
          <div className="h-full min-h-[300px] lg:min-h-full rounded-lg overflow-hidden">
            {currentLocation ? (
              <Map locations={[{
                id: 'current',
                userId: user?.username || '',
                latitude: currentLocation.coords.latitude,
                longitude: currentLocation.coords.longitude,
                timestamp: new Date()
              }]} />
            ) : (
              <div className="h-full bg-black/20 rounded-lg flex items-center justify-center">
                <p className="text-white/60">Obtén tu ubicación para ver el mapa</p>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
