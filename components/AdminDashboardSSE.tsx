'use client';

import { useState, useEffect } from 'react';
import dynamic from 'next/dynamic';
import { useSSE } from '../hooks/useSSE';
import { useAuth } from '../context/AuthContext';
import { FiUsers, FiMap, FiList, FiFilter, FiBarChart2, FiWifi, FiWifiOff, FiTrash2, FiX, FiPlus, FiUserPlus, FiKey } from 'react-icons/fi';

const Map = dynamic(() => import('./Map'), {
  ssr: false,
  loading: () => <div className="h-full bg-black/20 rounded-lg animate-pulse flex items-center justify-center text-white">Cargando mapa...</div>
});

interface UserLocation {
  id: string;
  user_id: string;
  username: string;
  latitude: number;
  longitude: number;
  accuracy?: number;
  timestamp: number;
  city?: string;
  country?: string;
}

interface ActiveUser {
  id: string;
  username: string;
  role: string;
  last_seen: number;
  is_active: boolean;
}

interface ConnectedDevice {
  device_id: string;
  username: string;
  is_tracking: boolean;
  last_seen: number;
  registered_at: number;
}

interface DeviceRemovedData {
  device_id: string;
}

interface DeleteDeviceError {
  error: string;
  availableDevices?: string[];
}

interface DeviceWithLocation {
  device_id: string;
  username: string;
  is_tracking: boolean;
  last_seen: number;
  registered_at: number;
  lastLocation?: UserLocation;
  city?: string;
  country?: string;
}

interface User {
  id: number;
  username: string;
  role: string;
  created_at: string;
  tracking_enabled: boolean;
}

interface CreateUserForm {
  username: string;
  password: string;
  role: string;
}

export default function AdminDashboardSSE() {
  const { user } = useAuth();
  
  if (!user || user.role !== 'admin') {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="bg-white p-8 rounded-lg shadow-md text-center">
          <h1 className="text-2xl font-bold text-red-600 mb-4">Acceso Denegado</h1>
          <p className="text-gray-600 mb-4">
            Solo los administradores pueden acceder a esta sección.
          </p>
          <p className="text-sm text-gray-500">
            Si crees que esto es un error, contacta al administrador del sistema.
          </p>
        </div>
      </div>
    );
  }

  const [userLocations, setUserLocations] = useState<UserLocation[]>([]);
  const [activeUsers, setActiveUsers] = useState<ActiveUser[]>([]);
  const [selectedDevice, setSelectedDevice] = useState<string>('');
  const [serverUrl, setServerUrl] = useState('');
  const [connectedDevices, setConnectedDevices] = useState<ConnectedDevice[]>([]);
  const [devicesWithLocation, setDevicesWithLocation] = useState<DeviceWithLocation[]>([]);
  const [activeTab, setActiveTab] = useState<'tracking' | 'users'>('tracking');
  const [users, setUsers] = useState<User[]>([]);
  const [showCreateUserForm, setShowCreateUserForm] = useState(false);
  const [createUserForm, setCreateUserForm] = useState<CreateUserForm>({
    username: '',
    password: '',
    role: 'user'
  });
  const [isCreatingUser, setIsCreatingUser] = useState(false);
  const [userMessage, setUserMessage] = useState<{ type: 'success' | 'error', text: string } | null>(null);
  const [resetPasswordForm, setResetPasswordForm] = useState<{ userId: number; username: string; newPassword: string; confirmPassword: string } | null>(null);
  const [isResettingPassword, setIsResettingPassword] = useState(false);

  useEffect(() => {
    if (typeof window !== 'undefined') {
      setServerUrl(window.location.origin);
    }
  }, []);

  const sseResult = useSSE(
    serverUrl ? `${serverUrl}/api/events` : '',
    {
      reconnect: true,
      reconnectInterval: 3000,
      maxReconnectAttempts: 10
    }
  );

  const isConnected = sseResult?.isConnected || false;
  const addEventListener = sseResult?.addEventListener || (() => () => {});
  const error = sseResult?.error || null;

  useEffect(() => {
    if (serverUrl && user?.role === 'admin') {
      loadInitialData();
      loadConnectedDevices();
    }
  }, [serverUrl, user]);

  useEffect(() => {
    if (activeTab === 'tracking' && serverUrl) {
      const interval = setInterval(() => {
        loadConnectedDevices();
      }, 5000);

      return () => clearInterval(interval);
    }
  }, [activeTab, serverUrl]);

  const getLocationInfo = async (lat: number, lng: number): Promise<{city: string, country: string}> => {
    try {
      const response = await fetch(`https://api.bigdatacloud.net/data/reverse-geocode-client?latitude=${lat}&longitude=${lng}&localityLanguage=es`);
      const data = await response.json();
      
      return {
        city: data.city || data.locality || 'Ciudad Desconocida',
        country: data.countryName || 'País Desconocido'
      };
    } catch (error) {
      console.error('Error getting location info:', error);
      return {
        city: 'Ciudad Desconocida',
        country: 'País Desconocido'
      };
    }
  };

  useEffect(() => {
    const combineDevicesWithLocations = async () => {
      const devicesWithLoc: DeviceWithLocation[] = [];
      
      for (const device of connectedDevices) {
        const userLocs = userLocations.filter(loc => loc.user_id.includes(device.device_id));
        const lastLocation = userLocs.length > 0 ? userLocs[userLocs.length - 1] : undefined;
        
        let city = 'Sin ubicación';
        let country = 'Sin ubicación';
        
        if (lastLocation) {
          const locationInfo = await getLocationInfo(lastLocation.latitude, lastLocation.longitude);
          city = locationInfo.city;
          country = locationInfo.country;
        }
        
        devicesWithLoc.push({
          device_id: device.device_id,
          username: device.username,
          is_tracking: device.is_tracking,
          last_seen: device.last_seen,
          registered_at: device.registered_at,
          lastLocation,
          city,
          country
        });
      }
      
      setDevicesWithLocation(devicesWithLoc);
    };
    
    if (connectedDevices.length > 0) {
      combineDevicesWithLocations();
    }
  }, [connectedDevices, userLocations]);

  useEffect(() => {
    if (!isConnected || typeof addEventListener !== 'function') return;

    try {
      const removeLocationListener = addEventListener('location-update', (locationData: UserLocation) => {
        console.log('Received location update:', locationData);
        
        setUserLocations(prev => {
          const filtered = prev.filter(loc => loc.user_id !== locationData.user_id);
          return [...filtered, locationData];
        });
      });

      const removeDeviceListener = addEventListener('device-removed', (data: DeviceRemovedData) => {
        console.log('Device removed:', data.device_id);
        
        setTimeout(() => loadConnectedDevices(), 500);
        
        if (selectedDevice === data.device_id) {
          setSelectedDevice('');
        }
      });

      return () => {
        if (typeof removeLocationListener === 'function') {
          removeLocationListener();
        }
        if (typeof removeDeviceListener === 'function') {
          removeDeviceListener();
        }
      };
    } catch (error) {
      console.error('Error setting up SSE listener:', error);
    }
  }, [isConnected, addEventListener, selectedDevice]);

  const loadInitialData = async () => {
    try {
      const locationsResponse = await fetch(`${serverUrl}/api/locations?timeframe=24h`);
      const locationsData = await locationsResponse.json();
      
      if (locationsData.locations) {
        setUserLocations(locationsData.locations);
      }

      const usersResponse = await fetch(`${serverUrl}/api/active-users`);
      const usersData = await usersResponse.json();
      
      if (usersData.users) {
        setActiveUsers(usersData.users);
      }

    } catch (error) {
      console.error('Error loading initial data:', error);
    }
  };

  const loadConnectedDevices = async () => {
    try {
      const response = await fetch(`${serverUrl}/api/admin/devices`);
      const data = await response.json();
      
      if (data.devices) {
        setConnectedDevices(data.devices);
      }
    } catch (error) {
      console.error('Error loading devices:', error);
    }
  };



  const handleDeleteDevice = async (deviceId: string) => {
    if (!confirm('¿Estás seguro de que quieres eliminar este dispositivo? Esta acción no se puede deshacer.')) {
      return;
    }

    console.log(`Attempting to delete device: ${deviceId}`);

    try {
      const response = await fetch(`${serverUrl}/api/admin/device/${deviceId}`, {
        method: 'DELETE',
        headers: { 'Content-Type': 'application/json' }
      });

      console.log(`Delete response status: ${response.status}`);
      
      if (response.ok) {
        const result = await response.json();
        
        if (result.success) {
          console.log(`Device ${deviceId} deleted successfully`);
          
          if (selectedDevice === deviceId) {
            setSelectedDevice('');
          }
          
          loadConnectedDevices();
          
          alert('Dispositivo eliminado exitosamente');
        } else {
          console.error('Delete failed:', result);
          alert('Error al eliminar el dispositivo: ' + result.error);
        }
      } else {
        const errorText = await response.text();
        console.error('Delete request failed:', response.status, errorText);
        
        try {
          const errorData: DeleteDeviceError = JSON.parse(errorText);
          alert(`Error ${response.status}: ${errorData.error}\nDispositivo solicitado: ${deviceId}\nDisponibles: ${errorData.availableDevices?.join(', ') || 'ninguno'}`);
        } catch {
          alert(`Error ${response.status}: ${errorText}`);
        }
      }
    } catch (error) {
      console.error('Network error deleting device:', error);
      alert('Error de red al eliminar el dispositivo: ' + (error instanceof Error ? error.message : 'Error desconocido'));
    }
  };

  const loadUsers = async () => {
    try {
      const response = await fetch(`${serverUrl}/api/admin/users`);
      if (response.ok) {
        const data = await response.json();
        setUsers(data.users);
      }
    } catch (error) {
      console.error('Error loading users:', error);
    }
  };

  const createUser = async () => {
    if (!createUserForm.username || !createUserForm.password) {
      setUserMessage({ type: 'error', text: 'Usuario y contraseña son requeridos' });
      return;
    }

    setIsCreatingUser(true);
    setUserMessage(null);

    try {
      const response = await fetch(`${serverUrl}/api/admin/users`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(createUserForm)
      });

      const data = await response.json();

      if (response.ok) {
        setUserMessage({ type: 'success', text: 'Usuario creado exitosamente' });
        setCreateUserForm({ username: '', password: '', role: 'user' });
        setShowCreateUserForm(false);
        loadUsers();
      } else {
        setUserMessage({ type: 'error', text: data.error || 'Error al crear usuario' });
      }
    } catch (error) {
      setUserMessage({ type: 'error', text: 'Error de conexión' });
      console.error('Error creating user:', error);
    } finally {
      setIsCreatingUser(false);
    }
  };

  const toggleUserTracking = async (userId: number, currentStatus: boolean) => {
    try {
      const response = await fetch(`${serverUrl}/api/admin/users/${userId}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ tracking_enabled: !currentStatus })
      });

      if (response.ok) {
        setUserMessage({ 
          type: 'success', 
          text: `Tracking ${!currentStatus ? 'activado' : 'desactivado'} exitosamente` 
        });
        loadUsers();
      } else {
        const data = await response.json();
        setUserMessage({ type: 'error', text: data.error || 'Error al actualizar tracking' });
      }
    } catch (error) {
      setUserMessage({ type: 'error', text: 'Error de conexión' });
      console.error('Error updating tracking:', error);
    }
  };

  const deleteUser = async (userId: number) => {
    if (!confirm('¿Estás seguro de que quieres eliminar este usuario?')) {
      return;
    }

    try {
      const response = await fetch(`${serverUrl}/api/admin/users/${userId}`, {
        method: 'DELETE'
      });

      if (response.ok) {
        setUserMessage({ type: 'success', text: 'Usuario eliminado exitosamente' });
        loadUsers();
      } else {
        const data = await response.json();
        setUserMessage({ type: 'error', text: data.error || 'Error al eliminar usuario' });
      }
    } catch (error) {
      setUserMessage({ type: 'error', text: 'Error de conexión' });
      console.error('Error deleting user:', error);
    }
  };

  useEffect(() => {
    if (activeTab === 'users' && serverUrl) {
      loadUsers();
    }
  }, [activeTab, serverUrl]);

  useEffect(() => {
    if (userMessage) {
      const timer = setTimeout(() => setUserMessage(null), 5000);
      return () => clearTimeout(timer);
    }
  }, [userMessage]);

  const handleResetUserPassword = (userId: number, username: string) => {
    setResetPasswordForm({
      userId,
      username,
      newPassword: '',
      confirmPassword: ''
    });
  };

  const resetUserPassword = async () => {
    if (!resetPasswordForm) return;

    if (resetPasswordForm.newPassword !== resetPasswordForm.confirmPassword) {
      setUserMessage({ type: 'error', text: 'Las contraseñas no coinciden' });
      return;
    }

    if (resetPasswordForm.newPassword.length < 6) {
      setUserMessage({ type: 'error', text: 'La contraseña debe tener al menos 6 caracteres' });
      return;
    }

    setIsResettingPassword(true);
    setUserMessage(null);

    try {
      const response = await fetch('/api/admin/reset-password', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          targetUserId: resetPasswordForm.userId,
          newPassword: resetPasswordForm.newPassword
        })
      });

      const data = await response.json();

      if (data.success) {
        setUserMessage({ type: 'success', text: data.message });
        setResetPasswordForm(null);
      } else {
        setUserMessage({ type: 'error', text: data.error });
      }
    } catch (error) {
      setUserMessage({ type: 'error', text: 'Error al cambiar la contraseña' });
    } finally {
      setIsResettingPassword(false);
    }
  };

  const selectedDeviceLocations = selectedDevice 
    ? userLocations.filter(loc => loc.user_id.includes(selectedDevice))
    : [];

  const selectedDeviceData = devicesWithLocation.find(d => d.device_id === selectedDevice);

  return (
    <div className="container mx-auto p-4 sm:p-6 lg:p-8 text-black">
      {/* Header con Tabs */}
      <div className="mb-6">
        <h1 className="text-2xl font-bold mb-4">Panel de Administración</h1>
        
        {/* Navigation Tabs */}
        <div className="border-b border-gray-200 mb-6">
          <nav className="-mb-px flex space-x-8">
            <button
              onClick={() => setActiveTab('tracking')}
              className={`py-2 px-1 border-b-2 font-medium text-sm ${
                activeTab === 'tracking'
                  ? 'border-indigo-500 text-indigo-600'
                  : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
              }`}
            >
              <FiMap className="inline mr-2" />
              Dispositivos y Tracking
            </button>
            <button
              onClick={() => setActiveTab('users')}
              className={`py-2 px-1 border-b-2 font-medium text-sm ${
                activeTab === 'users'
                  ? 'border-indigo-500 text-indigo-600'
                  : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
              }`}
            >
              <FiUsers className="inline mr-2" />
              Gestión de Usuarios
            </button>
          </nav>
        </div>
        
        {/* Messages */}
        {userMessage && (
          <div className={`mb-4 p-3 rounded-lg ${
            userMessage.type === 'success' 
              ? 'bg-green-100 border border-green-300 text-green-800'
              : 'bg-red-100 border border-red-300 text-red-800'
          }`}>
            {userMessage.text}
          </div>
        )}
      </div>

      {activeTab === 'tracking' && (
        <>
          <div className="flex items-center justify-between mb-6">
            <div className="flex items-center space-x-4">
              <div className="flex items-center">
                {isConnected ? (
                  <>
                    <FiWifi className="text-green-400 mr-2" />
                    <span className="text-green-400 text-sm">Conectado</span>
                  </>
                ) : (
                  <>
                    <FiWifiOff className="text-red-400 mr-2" />
                    <span className="text-red-400 text-sm">Desconectado</span>
                  </>
                )}
              </div>
              <span className="text-sm text-black/60">
                {devicesWithLocation.length} dispositivos activos
              </span>
            </div>
          
          </div>

          {/* Layout Principal */}
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
            {/* Lista de Dispositivos */}
            <div className="lg:col-span-1">
              <div className="bg-black/20 backdrop-blur-lg rounded-2xl shadow-2xl border border-white/10 p-6">
                <h3 className="text-lg font-semibold mb-4 flex items-center">
                  <FiUsers className="mr-3 text-purple-400"/>
                  Lista de Dispositivos
                </h3>
                
                <div className="space-y-3 max-h-[600px] overflow-y-auto pr-2">
                  {devicesWithLocation.map((device) => (
                    <div
                      key={device.device_id}
                      className={`p-4 rounded-lg border transition-all cursor-pointer ${
                        selectedDevice === device.device_id
                          ? 'bg-purple-500/20 border-purple-500/50'
                          : 'bg-black/20 border-white/10 hover:bg-black/30'
                      }`}
                      onClick={() => setSelectedDevice(device.device_id)}
                    >
                      <div className="flex items-center justify-between mb-2">
                        <div className="flex items-center">
                          <div className={`w-3 h-3 rounded-full mr-3 ${
                            device.is_tracking ? 'bg-green-400' : 'bg-red-400'
                          }`}></div>
                          <span className="font-medium text-sm">{device.username}</span>
                        </div>
                        <span className={`px-2 py-1 rounded-full text-xs font-medium ${
                          device.is_tracking 
                            ? 'bg-green-500/20 text-green-400' 
                            : 'bg-gray-500/20 text-gray-400'
                        }`}>
                          {device.is_tracking ? 'ACTIVO' : 'OFF'}
                        </span>
                      </div>
                      
                      <div className="text-sm text-black/80">
                        <div className="flex items-center mb-1">
                          <span className="text-black/60">📍</span>
                          <span className="ml-2">{device.city}</span>
                        </div>
                        <div className="flex items-center mb-2">
                          <span className="text-black/60">🌍</span>
                          <span className="ml-2">{device.country}</span>
                        </div>
                      </div>
                      
                      {device.lastLocation && (
                        <div className="text-xs text-black/50 mt-2">
                          Última actualización: {device.lastLocation.timestamp ? new Date(Number(device.lastLocation.timestamp)).toLocaleTimeString() : 'No disponible'}
                        </div>
                      )}
                    </div>
                  ))}
                  
                  {devicesWithLocation.length === 0 && (
                    <div className="text-center text-black/60 py-8">
                      <FiWifiOff className="mx-auto text-4xl mb-2" />
                      <p className="text-black">No hay dispositivos conectados</p>
                    </div>
                  )}
                </div>
              </div>
            </div>

            {/* Mapa del dispositivo seleccionado */}
            <div className="lg:col-span-2">
              <div className="bg-black/20 backdrop-blur-lg rounded-2xl shadow-2xl border border-white/10 p-6">
                <div className="flex justify-between items-center mb-4">
                  <h3 className="text-xl font-semibold flex items-center">
                    <FiMap className="mr-3 text-purple-400"/>
                    {selectedDevice 
                      ? `Ubicación de ${selectedDeviceData?.username || 'Usuario'}` 
                      : 'Selecciona un dispositivo para ver su ubicación'}
                  </h3>
                  {selectedDevice && selectedDeviceLocations.length > 0 && (
                    <span className="text-sm text-black/70 bg-gray-200 px-3 py-1 rounded-full">
                      {selectedDeviceLocations.length} ubicaciones
                    </span>
                  )}
                </div>
                
                <div className="h-[500px] rounded-lg overflow-hidden">
                  {selectedDevice && selectedDeviceLocations.length > 0 ? (
                    <Map 
                      locations={selectedDeviceLocations.map(loc => ({
                        id: loc.user_id,
                        userId: loc.username,
                        latitude: loc.latitude,
                        longitude: loc.longitude,
                        timestamp: new Date(Number(loc.timestamp)),
                        accuracy: loc.accuracy
                      }))} 
                      zoom={12}
                    />
                  ) : (
                    <div className="h-full bg-gradient-to-br from-blue-900/50 to-purple-900/50 rounded-lg flex items-center justify-center">
                      <div className="text-center text-black/60">
                        <FiMap className="mx-auto text-6xl mb-4" />
                        <h3 className="text-xl font-medium mb-2 text-black">Sin selección</h3>
                        <p className="text-black">Selecciona un dispositivo de la lista para ver su ubicación en el mapa</p>
                      </div>
                    </div>
                  )}
                </div>

                {/* Información detallada del dispositivo seleccionado */}
                {selectedDeviceData && selectedDeviceData.lastLocation && (
                  <div className="mt-4 p-4 bg-black/30 rounded-lg">
                    <h4 className="font-medium mb-2 text-black">Información detallada:</h4>
                    <div className="grid grid-cols-2 gap-4 text-sm">
                      <div>
                        <span className="text-black/60">Coordenadas:</span>
                        <p className="font-mono text-green-400">
                          {Number(selectedDeviceData.lastLocation.latitude).toFixed(6)}, {Number(selectedDeviceData.lastLocation.longitude).toFixed(6)}
                        </p>
                      </div>
                      <div>
                        <span className="text-black/60">Precisión:</span>
                        <p className="text-purple-400">
                          {selectedDeviceData.lastLocation.accuracy 
                            ? `±${Number(selectedDeviceData.lastLocation.accuracy).toFixed(0)}m`
                            : 'N/A'
                          }
                        </p>
                      </div>
                      <div>
                        <span className="text-black/60">Ciudad:</span>
                        <p className="text-blue-400">{selectedDeviceData.city}</p>
                      </div>
                      <div>
                        <span className="text-black/60">País:</span>
                        <p className="text-blue-400">{selectedDeviceData.country}</p>
                      </div>
                    </div>
                  </div>
                )}
              </div>
            </div>
          </div>
        </>
      )}

      {activeTab === 'users' && (
        <div className="space-y-6">
          {/* User Management Header */}
          <div className="flex justify-between items-center">
            <h2 className="text-xl font-semibold">Usuarios del Sistema</h2>
            <button
              onClick={() => setShowCreateUserForm(!showCreateUserForm)}
              className="bg-indigo-600 hover:bg-indigo-700 text-white px-4 py-2 rounded-lg flex items-center gap-2 transition-colors"
            >
              <FiUserPlus />
              Crear Usuario
            </button>
          </div>

          {/* Create User Form */}
          {showCreateUserForm && (
            <div className="bg-gray-50 p-6 rounded-lg border">
              <h3 className="text-lg font-medium mb-4">Crear Nuevo Usuario</h3>
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Usuario
                  </label>
                  <input
                    type="text"
                    value={createUserForm.username}
                    onChange={(e) => setCreateUserForm(prev => ({...prev, username: e.target.value}))}
                    className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-indigo-500"
                    placeholder="Nombre de usuario"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Contraseña
                  </label>
                  <input
                    type="password"
                    value={createUserForm.password}
                    onChange={(e) => setCreateUserForm(prev => ({...prev, password: e.target.value}))}
                    className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-indigo-500"
                    placeholder="Contraseña"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Rol
                  </label>
                  <select
                    value={createUserForm.role}
                    onChange={(e) => setCreateUserForm(prev => ({...prev, role: e.target.value}))}
                    className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-indigo-500"
                  >
                    <option value="user">Usuario</option>
                    <option value="admin">Administrador</option>
                  </select>
                </div>
              </div>
              <div className="flex justify-end gap-3 mt-4">
                <button
                  onClick={() => {
                    setShowCreateUserForm(false);
                    setCreateUserForm({ username: '', password: '', role: 'user' });
                  }}
                  className="px-4 py-2 text-gray-700 bg-gray-200 hover:bg-gray-300 rounded-md transition-colors"
                >
                  Cancelar
                </button>
                <button
                  onClick={createUser}
                  disabled={isCreatingUser}
                  className="px-4 py-2 bg-indigo-600 hover:bg-indigo-700 disabled:bg-indigo-400 text-white rounded-md transition-colors flex items-center gap-2"
                >
                  {isCreatingUser && <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin"></div>}
                  {isCreatingUser ? 'Creando...' : 'Crear Usuario'}
                </button>
              </div>
            </div>
          )}

          {/* Users List */}
          <div className="bg-white rounded-lg border shadow-sm">
            <div className="overflow-x-auto">
              <table className="w-full">
                <thead className="bg-gray-50 border-b">
                  <tr>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Usuario
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Rol
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Tracking
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Fecha de Creación
                    </th>
                    <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Acciones
                    </th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-200">
                  {users.map((userData) => (
                    <tr key={userData.id} className="hover:bg-gray-50">
                      <td className="px-6 py-4 whitespace-nowrap">
                        <div className="flex items-center">
                          <FiUsers className="mr-3 text-gray-400" />
                          <div>
                            <div className="text-sm font-medium text-gray-900">
                              {userData.username}
                            </div>
                            <div className="text-sm text-gray-500">
                              ID: {userData.id}
                            </div>
                          </div>
                        </div>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap">
                        <span className={`inline-flex px-2 py-1 text-xs font-semibold rounded-full ${
                          userData.role === 'admin'
                            ? 'bg-purple-100 text-purple-800'
                            : 'bg-blue-100 text-blue-800'
                        }`}>
                          {userData.role === 'admin' ? 'Administrador' : 'Usuario'}
                        </span>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap">
                        {userData.role === 'admin' ? (
                          <span className="inline-flex items-center px-3 py-1 text-xs font-semibold rounded-full bg-gray-100 text-gray-500">
                            <div className="w-2 h-2 rounded-full mr-2 bg-gray-400"></div>
                            No aplica
                          </span>
                        ) : (
                          <button
                            onClick={() => toggleUserTracking(userData.id, userData.tracking_enabled)}
                            className={`inline-flex items-center px-3 py-1 text-xs font-semibold rounded-full transition-colors ${
                              userData.tracking_enabled
                                ? 'bg-green-100 text-green-800 hover:bg-green-200'
                                : 'bg-red-100 text-red-800 hover:bg-red-200'
                            }`}
                            title={userData.tracking_enabled ? 'Desactivar tracking' : 'Activar tracking'}
                          >
                            <div className={`w-2 h-2 rounded-full mr-2 ${
                              userData.tracking_enabled ? 'bg-green-500' : 'bg-red-500'
                            }`}></div>
                            {userData.tracking_enabled ? 'Activo' : 'Inactivo'}
                          </button>
                        )}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                        {new Date(userData.created_at).toLocaleDateString('es-ES', {
                          year: 'numeric',
                          month: 'short',
                          day: 'numeric'
                        })}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-right text-sm font-medium">
                        <div className="flex gap-2 justify-end">
                          <button
                            onClick={() => handleResetUserPassword(userData.id, userData.username)}
                            className="text-blue-600 hover:text-blue-900 transition-colors"
                            title="Cambiar contraseña"
                          >
                            <FiKey />
                          </button>
                          {userData.role === 'admin' ? (
                            <span className="text-gray-400" title="Los administradores no se pueden eliminar">
                              <FiTrash2 className="opacity-30" />
                            </span>
                          ) : (
                            <button
                              onClick={() => deleteUser(userData.id)}
                              className="text-red-600 hover:text-red-900 transition-colors"
                              title="Eliminar usuario"
                            >
                              <FiTrash2 />
                            </button>
                          )}
                        </div>
                      </td>
                    </tr>
                  ))}
                  {users.length === 0 && (
                    <tr>
                      <td colSpan={5} className="px-6 py-8 text-center text-gray-500">
                        <FiUsers className="mx-auto text-4xl mb-2 text-gray-300" />
                        <p>No hay usuarios registrados</p>
                        <p className="text-sm">Crea el primer usuario para comenzar</p>
                      </td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      )}


      {/* Reset Password Modal */}
      {resetPasswordForm && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-white rounded-lg p-6 max-w-md w-full mx-4">
            <div className="flex items-center mb-4">
              <FiKey className="text-indigo-600 mr-2" />
              <h3 className="text-lg font-medium text-gray-900">
                Cambiar contraseña
              </h3>
            </div>
            <div className="mb-4 p-3 bg-indigo-50 rounded-lg border border-indigo-200">
              <p className="text-sm text-indigo-800">
                <strong>Usuario:</strong> {resetPasswordForm.username}
              </p>
            </div>
            
            <div className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Nueva contraseña
                </label>
                <input
                  type="password"
                  value={resetPasswordForm.newPassword}
                  onChange={(e) => setResetPasswordForm(prev => prev ? { ...prev, newPassword: e.target.value } : null)}
                  className="w-full p-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500"
                  disabled={isResettingPassword}
                />
              </div>
              
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Confirmar nueva contraseña
                </label>
                <input
                  type="password"
                  value={resetPasswordForm.confirmPassword}
                  onChange={(e) => setResetPasswordForm(prev => prev ? { ...prev, confirmPassword: e.target.value } : null)}
                  className="w-full p-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500"
                  disabled={isResettingPassword}
                />
              </div>
            </div>
            
            <div className="flex justify-end gap-3 mt-6">
              <button
                onClick={() => setResetPasswordForm(null)}
                disabled={isResettingPassword}
                className="px-4 py-2 text-gray-700 bg-gray-200 hover:bg-gray-300 rounded-lg transition-colors"
              >
                Cancelar
              </button>
              <button
                onClick={resetUserPassword}
                disabled={isResettingPassword || !resetPasswordForm.newPassword || !resetPasswordForm.confirmPassword}
                className="px-4 py-2 bg-indigo-600 hover:bg-indigo-700 disabled:bg-gray-400 text-white rounded-lg transition-colors flex items-center gap-2"
              >
                {isResettingPassword && <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin"></div>}
                {isResettingPassword ? 'Cambiando...' : 'Cambiar contraseña'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}