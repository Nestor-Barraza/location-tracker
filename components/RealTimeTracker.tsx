'use client';

import { useState, useEffect } from 'react';
import { useAuth } from '../context/AuthContext';
import { useGeolocation } from '../hooks/useGeolocation';
import { useSocket } from '../hooks/useSocket';
import { FiPlay, FiSquare, FiClock } from 'react-icons/fi';

export default function RealTimeTracker() {
  const { user } = useAuth();
  const socket = useSocket('http://localhost:3001');
  const { startTracking } = useGeolocation(user?.id || '', socket);
  const [isTracking, setIsTracking] = useState(false);
  const [trackingDuration, setTrackingDuration] = useState(0);

  useEffect(() => {
    if (socket && user) {
      socket.emit('user-login', { username: user.username, role: user.role });
    }
  }, [socket, user]);

  useEffect(() => {
    let interval: NodeJS.Timeout;
    let stopTracking: (() => void) | undefined;

    if (isTracking) {
      stopTracking = startTracking();
      interval = setInterval(() => {
        setTrackingDuration(prev => prev + 1);
      }, 1000);
    }

    return () => {
      if (interval) clearInterval(interval);
      if (stopTracking) stopTracking();
    };
  }, [isTracking, startTracking]);

  const handleToggleTracking = () => {
    if (isTracking) {
      setIsTracking(false);
      setTrackingDuration(0);
    } else {
      setIsTracking(true);
      setTrackingDuration(0);
    }
  };

  const formatDuration = (seconds: number) => {
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${mins}:${secs.toString().padStart(2, '0')}`;
  };

  return (
    <div className="bg-black/20 backdrop-blur-lg rounded-2xl shadow-2xl border border-white/10 p-6">
      <h3 className="text-lg font-semibold mb-4 flex items-center"><FiClock className="mr-3 text-purple-400"/>Seguimiento Continuo</h3>
      
      <div className="flex items-center justify-between">
        <div>
          <p className="text-sm text-white/80">
            {isTracking 
              ? `Rastreando: ${formatDuration(trackingDuration)}` 
              : 'Rastreo detenido'}
          </p>
          {isTracking && (
            <div className="mt-2 flex items-center space-x-2">
              <div className="w-2.5 h-2.5 bg-green-400 rounded-full animate-pulse"></div>
              <span className="text-xs text-green-300">
                Tu ubicación se actualiza automáticamente
              </span>
            </div>
          )}
        </div>
        
        <button
          onClick={handleToggleTracking}
          className={`px-4 py-2 rounded-lg font-semibold flex items-center transition-all duration-200 ${isTracking ? 'bg-red-500/80 hover:bg-red-500/100 text-white' : 'bg-green-500/80 hover:bg-green-500/100 text-white'}`}>
          {isTracking ? <FiSquare className="mr-2"/> : <FiPlay className="mr-2"/>}
          {isTracking ? 'Detener' : 'Iniciar'}
        </button>
      </div>
    </div>
  );
}
