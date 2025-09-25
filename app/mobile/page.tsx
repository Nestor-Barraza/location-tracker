'use client';

import { useState, useEffect, useCallback } from 'react';


interface Command {
  id: string;
  action: string;
  interval?: number;
  created_at: number;
  processed: boolean;
}

interface CommandResponse {
  commands: Command[];
}

interface ServerConfig {
  apiUrl: string;
}

interface LoginCredentials {
  username: string;
  password: string;
}

interface User {
  id: string;
  username: string;
  role: string;
}

interface LoginResponse {
  success: boolean;
  user?: User;
  error?: string;
}

export default function MobilePage() {
  const [isAuthenticated, setIsAuthenticated] = useState(false);
  const [user, setUser] = useState<User | null>(null);
  const [loginForm, setLoginForm] = useState({ username: '', password: '' });
  const [loginError, setLoginError] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [isTracking, setIsTracking] = useState(false);
  const [deviceId, setDeviceId] = useState('');
  const [locationCount, setLocationCount] = useState(0);
  const [currentInterval, setCurrentInterval] = useState(30);
  const [isTrackingEnabled, setIsTrackingEnabled] = useState(true);
  const [statusText, setStatusText] = useState('Iniciando...');
  const [statusType, setStatusType] = useState<'active' | 'inactive' | 'warning'>('warning');
  const [isLocationPermissionGranted, setIsLocationPermissionGranted] = useState(false);

  const getApiUrl = (): string => {
    if (typeof window !== 'undefined') {
      return '/api';
    }
    return '/api';
  };

  const serverConfig: ServerConfig = {
    apiUrl: getApiUrl()
  };

  const generateDeviceId = useCallback(() => {
    let storedDeviceId = localStorage.getItem('device_id');
    if (!storedDeviceId) {
      storedDeviceId = 'mobile_' + Math.random().toString(36).substr(2, 9);
      localStorage.setItem('device_id', storedDeviceId);
    }
    return storedDeviceId;
  }, []);

  const login = useCallback(async (credentials: LoginCredentials): Promise<boolean> => {
    setIsLoading(true);
    setLoginError('');
    
    try {
      const response = await fetch(`${serverConfig.apiUrl}/login`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(credentials)
      });

      const data: LoginResponse = await response.json();
      
      if (data.success && data.user) {
        setUser(data.user);
        setIsAuthenticated(true);
        localStorage.setItem('mobile_user', JSON.stringify(data.user));
        localStorage.setItem('mobile_auth', 'true');
        return true;
      } else {
        setLoginError(data.error || 'Error de autenticación');
        return false;
      }
    } catch (error) {
      setLoginError('Error de conexión');
      console.error('Login error:', error);
      return false;
    } finally {
      setIsLoading(false);
    }
  }, [serverConfig.apiUrl]);

  const logout = useCallback(async () => {
    try {
      await fetch(`${serverConfig.apiUrl}/mobile/logout`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ device_id: deviceId })
      });
    } catch (error) {
      console.error('Logout API error:', error);
    }
    
    setIsAuthenticated(false);
    setUser(null);
    localStorage.removeItem('mobile_user');
    localStorage.removeItem('mobile_auth');
  }, [serverConfig.apiUrl, deviceId]);

  const checkTrackingStatus = useCallback(async () => {
    if (!user) return false;
    
    try {
      const response = await fetch(`${serverConfig.apiUrl}/user/tracking-status?username=${encodeURIComponent(user.username)}`);
      
      if (response.ok) {
        const result = await response.json();
        return result.tracking_enabled || false;
      }
    } catch (error) {
      console.error('Error checking tracking status:', error);
    }
    
    return false;
  }, [serverConfig.apiUrl, user]);

  const registerDevice = useCallback(async () => {
    if (!user || !deviceId) return;
    
    try {
      const checkResponse = await fetch(`${serverConfig.apiUrl}/device/${deviceId}/status`, {
        method: 'GET',
        headers: { 'Content-Type': 'application/json' }
      });
      
      if (checkResponse.ok) {
        console.log('Device already registered in server');
        return; 
      }
      
      const trackingEnabled = await checkTrackingStatus();
      if (!trackingEnabled) {
        setStatusText('Tracking deshabilitado por admin');
        setStatusType('inactive');
        return;
      }
      
      const controller = new AbortController();
      const timeoutId = setTimeout(() => controller.abort(), 5000); 
      
      const response = await fetch(`${serverConfig.apiUrl}/device/register`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          device_id: deviceId,
          username: user.username,
          user_agent: navigator.userAgent
        }),
        signal: controller.signal
      });

      clearTimeout(timeoutId);
      
      if (response.ok) {
        console.log('Device registered successfully');
        
        if (isLocationPermissionGranted && !isTracking) {
          await startTracking();
        }
      } else {
        const errorData = await response.json();
        throw new Error(errorData.error || 'Registration failed');
      }
    } catch (error) {
      if (error instanceof Error && error.name === 'AbortError') {
        console.error('Device registration request timed out');
      } else {
        console.error('Error registering device:', error);
        setStatusText('Error de conexión');
        setStatusType('inactive');
      }
    }
  }, [serverConfig.apiUrl, deviceId, user, checkTrackingStatus]);

  const checkServerCommands = useCallback(async () => {
    if (!deviceId) return;
    
    const lastCheck = sessionStorage.getItem('last_command_check');
    const now = Date.now();
    if (lastCheck && now - parseInt(lastCheck) < 3000) return; 
    
    try {
      const controller = new AbortController();
      const timeoutId = setTimeout(() => controller.abort(), 5000);
      
      const response = await fetch(`${serverConfig.apiUrl}/device/${deviceId}/commands`, {
        signal: controller.signal
      });
      
      clearTimeout(timeoutId);
      sessionStorage.setItem('last_command_check', now.toString());
      
      if (response.ok) {
        const data: CommandResponse = await response.json();
        await processCommands(data.commands || []);
      }
    } catch (error) {
      if (error instanceof Error && error.name === 'AbortError') {
        console.error('Command check request timed out');
      } else {
        console.error('Error checking commands:', error);
      }
    }
  }, [serverConfig.apiUrl, deviceId]);

  const sendLocationToServer = useCallback(async (position: GeolocationPosition) => {
    if (!isAuthenticated || !user || !deviceId) return;
    
    const lastSent = sessionStorage.getItem('last_location_sent');
    const now = Date.now();
    if (lastSent && now - parseInt(lastSent) < 5000) return; 
    
    try {
      const controller = new AbortController();
      const timeoutId = setTimeout(() => controller.abort(), 5000);
      
      const response = await fetch(`${serverConfig.apiUrl}/location`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          user_id: deviceId,
          username: user.username,
          latitude: position.coords.latitude,
          longitude: position.coords.longitude,
          accuracy: position.coords.accuracy
        }),
        signal: controller.signal
      });
      
      clearTimeout(timeoutId);
      sessionStorage.setItem('last_location_sent', now.toString());
      
      if (response.ok) {
        setLocationCount(prev => prev + 1);
        console.log(`Location sent successfully (#${locationCount + 1})`);
      } else {
        const errorData = await response.json();
        console.error('Location send failed:', errorData.error);
      }
    } catch (error) {
      if (error instanceof Error && error.name === 'AbortError') {
        console.error('Location send request timed out');
      } else {
        console.error('Error sending location:', error);
      }
    }
  }, [serverConfig.apiUrl, isAuthenticated, user, deviceId, locationCount]);

  const startTracking = useCallback(async () => {
    if (isTracking || !isLocationPermissionGranted) return;
    
    setIsTracking(true);
    setStatusText('Monitoreo Activo');
    setStatusType('active');
    
    try {
      const watchId = navigator.geolocation.watchPosition(
        (position) => {
          const lastSent = sessionStorage.getItem('last_location_sent');
          const now = Date.now();
          
          if (!lastSent || now - parseInt(lastSent) >= 5000) { 
            sendLocationToServer(position);
          }
        },
        (error) => {
          console.error('Watch position error:', error.message);
        },
        {
          enableHighAccuracy: true,
          timeout: 30000,
          maximumAge: 10000
        }
      );
      
      sessionStorage.setItem('tracking_watch_id', watchId.toString());
      
    } catch (error) {
      console.error('Start tracking error:', error);
      setStatusText('Error en tracking');
      setStatusType('inactive');
      setIsTracking(false);
    }
  }, [isTracking, isLocationPermissionGranted, sendLocationToServer]);

  const stopTracking = useCallback(() => {
    setIsTracking(false);
    setStatusText('Standby');
    setStatusType('warning');
    
    const watchId = sessionStorage.getItem('tracking_watch_id');
    if (watchId) {
      navigator.geolocation.clearWatch(parseInt(watchId));
      sessionStorage.removeItem('tracking_watch_id');
    }
  }, []);

  const processCommands = useCallback(async (commands: Command[]) => {
    for (const command of commands) {
      switch (command.action) {
        case 'update_interval':
          setCurrentInterval(command.interval || 30);
          if (isTracking) {
            stopTracking();
            setTimeout(() => startTracking(), 1000);
          }
          break;
        case 'start_tracking':
        case 'stop_tracking':
          break;
      }
      
      await acknowledgeCommand(command.id);
    }
  }, [isTracking, startTracking, stopTracking]);

  const acknowledgeCommand = useCallback(async (commandId: string) => {
    try {
      await fetch(`${serverConfig.apiUrl}/device/command/${commandId}/ack`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ device_id: deviceId })
      });
    } catch (error) {
      console.error('Error acknowledging command:', error);
    }
  }, [serverConfig.apiUrl, deviceId]);

  const getCurrentLocation = useCallback((): Promise<GeolocationPosition> => {
    return new Promise((resolve, reject) => {
      navigator.geolocation.getCurrentPosition(
        (position) => {
          sendLocationToServer(position);
          resolve(position);
        },
        (error) => {
          let errorMessage = 'Error de ubicación desconocido';
          
          switch(error.code) {
            case error.PERMISSION_DENIED:
              errorMessage = 'Permisos de ubicación denegados';
              break;
            case error.POSITION_UNAVAILABLE:
              errorMessage = 'Ubicación no disponible';
              break;
            case error.TIMEOUT:
              errorMessage = 'Timeout obteniendo ubicación';
              break;
          }
          
          console.error(`Error de ubicación: ${errorMessage}`);
          reject(new Error(errorMessage));
        },
        {
          enableHighAccuracy: true,
          timeout: 15000,
          maximumAge: 60000
        }
      );
    });
  }, [sendLocationToServer]);

  const requestLocationPermission = useCallback(async (): Promise<boolean> => {
    try {
      const position = await new Promise<GeolocationPosition>((resolve, reject) => {
        navigator.geolocation.getCurrentPosition(resolve, reject, {
          enableHighAccuracy: true,
          timeout: 15000,
          maximumAge: 60000
        });
      });
      
      setIsLocationPermissionGranted(true);
      localStorage.setItem('location_permission_granted', 'true');

      
      if (isAuthenticated && deviceId && user) {
        await registerDevice();
      }
      
      return true;
    } catch (error) {
      console.error('Location permission denied:', error);
      setIsLocationPermissionGranted(false);
      return false;
    }
  }, [isAuthenticated, deviceId, user, registerDevice]);

  useEffect(() => {
    const initializeApp = async () => {
      const savedUser = localStorage.getItem('mobile_user');
      const savedAuth = localStorage.getItem('mobile_auth');
      const savedLocationPermission = localStorage.getItem('location_permission_granted');
      
      if (savedAuth === 'true' && savedUser) {
        const userData: User = JSON.parse(savedUser);
        setUser(userData);
        setIsAuthenticated(true);
      }
      
      if (savedLocationPermission === 'true') {
        setIsLocationPermissionGranted(true);
      }
      
      const generatedDeviceId = generateDeviceId();
      setDeviceId(generatedDeviceId);
    };

    initializeApp();
  }, [generateDeviceId]);

  useEffect(() => {
    if (isAuthenticated && deviceId && user) {
      if (isLocationPermissionGranted) {
        registerDevice();
      } else {
        requestLocationPermission();
      }
      const commandInterval = setInterval(checkServerCommands, 10000);
      return () => clearInterval(commandInterval);
    }
  }, [isAuthenticated, deviceId, user, isLocationPermissionGranted, checkServerCommands, registerDevice, requestLocationPermission]);


  if (!isAuthenticated) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-indigo-600 to-purple-700 text-white flex items-center justify-center p-5">
        <div className="bg-white/10 backdrop-blur-lg rounded-2xl p-8 max-w-md w-full border border-white/20">
          <div className="text-center mb-8">
            <div className="text-6xl mb-4">🔐</div>
            <h1 className="text-2xl font-bold mb-2">Acceso Seguro</h1>
            <p className="text-white/80">Ingrese sus credenciales para continuar</p>
          </div>
          
          <div className="space-y-4">
            <div>
              <input
                type="text"
                placeholder="Usuario"
                value={loginForm.username}
                onChange={(e) => setLoginForm(prev => ({ ...prev, username: e.target.value }))}
                className="w-full p-3 rounded-lg bg-white/10 border border-white/20 text-white placeholder-white/60 focus:outline-none focus:border-white/40"
                disabled={isLoading}
              />
            </div>
            
            <div>
              <input
                type="password"
                placeholder="Contraseña"
                value={loginForm.password}
                onChange={(e) => setLoginForm(prev => ({ ...prev, password: e.target.value }))}
                className="w-full p-3 rounded-lg bg-white/10 border border-white/20 text-white placeholder-white/60 focus:outline-none focus:border-white/40"
                disabled={isLoading}
              />
            </div>
            
            {loginError && (
              <div className="text-red-400 text-sm text-center bg-red-900/20 p-2 rounded-lg">
                {loginError}
              </div>
            )}
            
            <button
              onClick={() => login(loginForm)}
              disabled={isLoading || !loginForm.username || !loginForm.password}
              className="w-full bg-white/20 hover:bg-white/30 disabled:bg-white/10 disabled:opacity-50 p-3 rounded-lg font-medium transition-colors"
            >
              {isLoading ? 'Verificando...' : 'Acceder'}
            </button>
          </div>
        </div>
      </div>
    );
  }

  if (!isLocationPermissionGranted) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-indigo-600 to-purple-700 text-white flex items-center justify-center p-5">
        <div className="bg-white/10 backdrop-blur-lg rounded-2xl p-8 max-w-md w-full border border-white/20">
          <div className="text-center">
            <div className="text-6xl mb-6 animate-pulse">📍</div>
            <h2 className="text-2xl font-bold mb-4">Configurando Tracking</h2>
            <p className="text-white/80 mb-6 leading-relaxed">
              Solicitando permisos de ubicación automáticamente...
            </p>
            
            <div className="bg-yellow-900/20 p-4 rounded-xl mb-6 border border-yellow-500/30">
              <p className="text-yellow-200 text-sm">
                ⚠️ El seguimiento iniciará automáticamente una vez otorgados los permisos
              </p>
            </div>
            
            <div className="flex justify-center">
              <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-white"></div>
            </div>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-indigo-600 to-purple-700 text-white">
      <div className="container mx-auto max-w-md p-5 min-h-screen flex flex-col">
        <div className="text-center pt-10 mb-8">
          <h1 className="text-3xl font-bold mb-3">📍 Location Tracker</h1>
          <p className="text-lg opacity-90">Seguimiento 24/7 en tiempo real</p>
        </div>

        <div className="bg-white/10 backdrop-blur-lg rounded-2xl p-6 mb-5 border border-white/20">
          <div className="text-center py-10">
            <div className="text-6xl mb-5">🛡️</div>
            <h2 className="text-2xl font-bold mb-4">Monitoreo de Seguridad</h2>
            <p className="text-white/80 text-base leading-relaxed mb-6">
              Bienvenido {user?.username}<br/>
              <span className="opacity-70 text-sm">Tracking automático activo 24/7</span>
            </p>
            
            <div className="bg-green-900/20 p-4 rounded-xl mb-6 border border-green-500/30">
              <div className="flex items-center justify-center">
                <div className="w-3 h-3 rounded-full mr-3 bg-green-400 animate-pulse"></div>
                <span className="ml-2 font-medium text-green-400">Monitoreo Activo</span>
              </div>
            </div>
            
            <div className="grid grid-cols-2 gap-4 text-xs mb-6">
              <div className="bg-white/10 p-3 rounded-lg">
                <div className="text-white/60">Ubicaciones enviadas</div>
                <div className="text-lg font-bold text-green-400">{locationCount}</div>
              </div>
              <div className="bg-white/10 p-3 rounded-lg">
                <div className="text-white/60">Estado</div>
                <div className="text-lg font-bold text-green-400">
                  {isTracking ? 'ACTIVO' : 'INICIANDO'}
                </div>
              </div>
            </div>
          </div>
          <div className="text-center pb-4">
            <div className="text-white/60 text-sm leading-relaxed">
              <p>ID del dispositivo:</p>
              <p className="font-mono bg-white/10 p-2 rounded-lg my-3 text-sm">
                {deviceId}
              </p>
              <button
                onClick={logout}
                className="text-red-400 hover:text-red-300 text-sm underline"
              >
                Cerrar Sesión
              </button>
              <p className="text-xs opacity-70 mt-2">
                Nota: El seguimiento continúa por seguridad
              </p>
            </div>
          </div>
        </div>


      </div>
    </div>
  );
}