'use client';

import { useState, useEffect } from 'react';
import dynamic from 'next/dynamic';
import { useSocket } from '../hooks/useSocket';
import { useAuth } from '../context/AuthContext';
import { FiUsers, FiMap, FiList, FiFilter, FiBarChart2 } from 'react-icons/fi';

const Map = dynamic(() => import('./Map'), {
  ssr: false,
  loading: () => <div className="h-full bg-black/20 rounded-lg animate-pulse flex items-center justify-center text-white">Cargando mapa...</div>
});

interface UserLocation {
  id: string;
  username: string;
  latitude: number;
  longitude: number;
  timestamp: number;
}

export default function AdminDashboard() {
  const { user } = useAuth();
  const [serverUrl, setServerUrl] = useState('');
  const [enableSocket, setEnableSocket] = useState(false);
  
  useEffect(() => {
    if (typeof window !== 'undefined') {
      setServerUrl(window.location.origin);
      setTimeout(() => setEnableSocket(true), 1000);
    }
  }, []);

  const socket = useSocket(enableSocket ? serverUrl : '');
  const [userLocations, setUserLocations] = useState<UserLocation[]>([]);
  const [selectedUser, setSelectedUser] = useState<string>('all');

  useEffect(() => {
    if (socket && user && user.role === 'admin' && typeof window !== 'undefined') {
      try {
        socket.emit('user-login', { username: user.username, role: user.role });

        socket.on('all-locations', (locations: UserLocation[]) => {
          setUserLocations(locations);
        });

        socket.on('location-update', (location: UserLocation) => {
          setUserLocations(prev => {
            const filtered = prev.filter(loc => loc.id !== location.id);
            return [...filtered, location];
          });
        });

        socket.on('user-disconnected', (userId: string) => {
          setUserLocations(prev => prev.filter(loc => loc.id !== userId));
        });

        return () => {
          socket.off('all-locations');
          socket.off('location-update');
          socket.off('user-disconnected');
        };
      } catch (error) {
        console.error('Error setting up socket listeners:', error);
      }
    }
  }, [socket, user]);

  const displayLocations = selectedUser === 'all' 
    ? userLocations 
    : userLocations.filter(loc => loc.username === selectedUser);

  const uniqueUsers = Array.from(new Set(userLocations.map(loc => loc.username)));
  const userStats = uniqueUsers.map(username => {
    const userLocs = userLocations.filter(loc => loc.username === username);
    return {
      username,
      locationCount: userLocs.length,
      lastSeen: userLocs.length > 0 ? new Date(Math.max(...userLocs.map(l => l.timestamp))) : null,
    };
  });

  return (
    <div className="container mx-auto p-4 sm:p-6 lg:p-8 text-white">
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <div className="lg:col-span-1 space-y-6">
          <div className="bg-black/20 backdrop-blur-lg rounded-2xl shadow-2xl border border-white/10 p-6">
            <h2 className="text-xl font-semibold mb-4 flex items-center"><FiUsers className="mr-3 text-purple-400"/>Usuarios Conectados</h2>
            
            <div className="space-y-3 max-h-64 overflow-y-auto pr-2">
              {userStats.map((stat) => (
                <div key={stat.username} className="p-3 bg-black/20 rounded-lg">
                  <div className="flex items-center justify-between">
                    <h3 className="font-medium">{stat.username}</h3>
                    <div className="w-2.5 h-2.5 bg-green-400 rounded-full"></div>
                  </div>
                  <p className="text-sm text-white/70">
                    Ubicaciones: {stat.locationCount}
                  </p>
                  {stat.lastSeen && (
                    <p className="text-xs text-white/50">
                      Visto: {stat.lastSeen.toLocaleTimeString()}
                    </p>
                  )}
                </div>
              ))}
            </div>

            <div className="mt-6">
              <label className="block text-sm font-medium text-white/80 mb-2 flex items-center"><FiFilter className="mr-2"/>Filtrar por Usuario</label>
              <select
                value={selectedUser}
                onChange={(e) => setSelectedUser(e.target.value)}
                className="w-full bg-black/30 border border-white/20 rounded-lg px-3 py-2 focus:outline-none focus:ring-2 focus:ring-purple-500"
              >
                <option value="all">Todos los Usuarios</option>
                {uniqueUsers.map((username) => (
                  <option key={username} value={username}>
                    {username}
                  </option>
                ))}
              </select>
            </div>
          </div>

          <div className="bg-black/20 backdrop-blur-lg rounded-2xl shadow-2xl border border-white/10 p-6">
            <h3 className="text-lg font-semibold mb-4 flex items-center"><FiBarChart2 className="mr-3 text-purple-400"/>Resumen del Sistema</h3>
            <div className="space-y-3 text-sm">
              <p><strong>Total Ubicaciones:</strong> {userLocations.length}</p>
              <p><strong>Usuarios Activos:</strong> {uniqueUsers.length}</p>
              <p><strong>En Tiempo Real:</strong> <span className="text-green-400">Si</span></p>
            </div>
          </div>
        </div>

        <div className="lg:col-span-2 space-y-6">
          <div className="bg-black/20 backdrop-blur-lg rounded-2xl shadow-2xl border border-white/10 p-6 min-h-[400px] lg:min-h-0">
            <div className="flex justify-between items-center mb-4">
              <h3 className="text-xl font-semibold flex items-center"><FiMap className="mr-3 text-purple-400"/>
                {selectedUser === 'all' 
                  ? 'Todas las Ubicaciones' 
                  : `Ubicaciones de ${selectedUser}`}
              </h3>
              <span className="text-sm text-white/70 bg-black/20 px-3 py-1 rounded-full">
                {displayLocations.length} ubicaciones
              </span>
            </div>
            <div className="h-full min-h-[300px] lg:min-h-full rounded-lg overflow-hidden">
              <Map locations={displayLocations.map(loc => ({
                id: loc.id,
                userId: loc.username,
                latitude: loc.latitude,
                longitude: loc.longitude,
                timestamp: new Date(loc.timestamp)
              }))} />
            </div>
          </div>

          <div className="bg-black/20 backdrop-blur-lg rounded-2xl shadow-2xl border border-white/10 p-6">
            <h3 className="text-lg font-semibold mb-4 flex items-center"><FiList className="mr-3 text-purple-400"/>Actividad Reciente</h3>
            <div className="max-h-64 overflow-y-auto space-y-2 pr-2 text-sm">
              {displayLocations.length === 0 ? (
                <p className="text-white/60">No se han registrado ubicaciones aún</p>
              ) : (
                displayLocations
                  .sort((a, b) => b.timestamp - a.timestamp)
                  .slice(0, 20)
                  .map((loc) => (
                    <div key={`${loc.id}-${loc.timestamp}`} className="p-2.5 bg-black/20 rounded-lg">
                      <div className="flex justify-between">
                        <span className="font-medium">
                          {loc.username}
                        </span>
                        <span className="text-white/70">
                          {new Date(loc.timestamp).toLocaleString()}
                        </span>
                      </div>
                      <p className="text-white/60 mt-1">
                        {loc.latitude.toFixed(6)}, {loc.longitude.toFixed(6)}
                      </p>
                    </div>
                  ))
              )}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
