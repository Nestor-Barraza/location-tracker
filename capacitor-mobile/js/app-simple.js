class LocationTracker {
    constructor() {
        this.isTracking = false;
        this.deviceId = this.generateDeviceId();
        this.username = `device_${this.deviceId}`;
        this.locationCount = 0;
        this.startTime = null;
        this.trackingInterval = null;
        this.currentInterval = 30;
        this.watchId = null;
        this.currentPosition = null;
        this.commandCheckInterval = null;
        this.isTrackingEnabled = false;
        
        this.serverConfig = {
            host: window.MOBILE_HOST,
            port: window.MOBILE_PORT,
            get apiUrl() {
                return `http://${this.host}:${this.port}/api`;
            }
        };

        this.init();
    }

    async init() {
        console.log('Initializing LocationTracker...');
        this.loadStoredData();
        this.showMainApp();
        this.log('App inicializada correctamente');
        
        await this.registerDevice();
        
        this.startCommandPolling();
        
        this.log(`Dispositivo registrado: ${this.deviceId}`);
    }

    generateDeviceId() {
        let deviceId = localStorage.getItem('device_id');
        if (!deviceId) {
            deviceId = 'mobile_' + Math.random().toString(36).substr(2, 9);
            localStorage.setItem('device_id', deviceId);
        }
        return deviceId;
    }

    async registerDevice() {
        try {
            const response = await fetch(`${this.serverConfig.apiUrl}/device/register`, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                },
                body: JSON.stringify({
                    device_id: this.deviceId,
                    username: this.username,
                    user_agent: navigator.userAgent,
                    timestamp: Date.now()
                })
            });

            if (response.ok) {
                this.log('✅ Dispositivo registrado en el servidor');
            }
        } catch (error) {
            this.log(`❌ Error registrando dispositivo: ${error.message}`);
        }
    }

    startCommandPolling() {
        this.commandCheckInterval = setInterval(() => {
            this.checkServerCommands();
        }, 5000);
        
        this.log('Iniciando verificación de comandos remotos...');
    }

    async checkServerCommands() {
        try {
            const response = await fetch(`${this.serverConfig.apiUrl}/device/${this.deviceId}/commands`);
            if (response.ok) {
                const commands = await response.json();
                this.processCommands(commands);
            }
        } catch (error) {
            console.error('Error checking commands:', error);
        }
    }

    async processCommands(commands) {
        for (const command of commands.commands || []) {
            switch (command.action) {
                case 'start_tracking':
                    this.isTrackingEnabled = true;
                    this.currentInterval = command.interval || 30;
                    await this.startTracking();
                    this.log(`📡 Comando recibido: Iniciar tracking (${this.currentInterval}s)`);
                    break;
                    
                case 'stop_tracking':
                    this.isTrackingEnabled = false;
                    this.stopTracking();
                    this.log('📡 Comando recibido: Detener tracking');
                    break;
                    
                case 'update_interval':
                    this.currentInterval = command.interval || 30;
                    if (this.isTracking) {
                        this.stopTracking();
                        setTimeout(() => this.startTracking(), 1000);
                    }
                    this.log(`📡 Comando recibido: Actualizar intervalo (${this.currentInterval}s)`);
                    break;
            }
            
            await this.acknowledgeCommand(command.id);
        }
    }

    async acknowledgeCommand(commandId) {
        try {
            await fetch(`${this.serverConfig.apiUrl}/device/command/${commandId}/ack`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ device_id: this.deviceId })
            });
        } catch (error) {
            console.error('Error acknowledging command:', error);
        }
    }

    loadStoredData() {
        const stored = localStorage.getItem('locationTracker');
        if (stored) {
            try {
                const data = JSON.parse(stored);
                this.username = data.username || '';
                this.locationCount = data.locationCount || 0;
                
                if (this.username) {
                    this.showMainApp();
                }
            } catch (e) {
                console.error('Error loading stored data:', e);
            }
        }
    }

    saveStoredData() {
        const data = {
            username: this.username,
            locationCount: this.locationCount,
            lastSaved: Date.now()
        };
        localStorage.setItem('locationTracker', JSON.stringify(data));
    }

    async handleLogin() {
        const usernameInput = document.getElementById('username');
        const username = usernameInput.value.trim();
        
        if (!username) {
            this.showError('Por favor ingresa tu nombre');
            return;
        }

        this.showLoginLoading(true);
        
        try {
            if (!navigator.geolocation) {
                throw new Error('Geolocalización no disponible en este dispositivo');
            }

            this.username = username;
            this.showMainApp();
            this.log(`Usuario ${username} iniciado correctamente`);
            
            await this.startTracking();
            
            this.vibrate();
            
        } catch (error) {
            console.error('Login error:', error);
            this.showError(error.message);
        } finally {
            this.showLoginLoading(false);
        }
    }

    async startTracking() {
        if (this.isTracking || !this.isTrackingEnabled) return;
        
        this.log('Iniciando tracking de ubicación por orden del administrador...');
        this.isTracking = true;
        this.startTime = Date.now();
        
        this.updateStatus('Solicitando permisos...', 'warning');
        
        try {
            await this.getCurrentLocation();
            
            this.setupPeriodicTracking();
            
            this.setupWatchPosition();
            
            this.updateStatus('Monitoreo Activo', 'active');
            this.log(`Tracking iniciado remotamente - Intervalo: ${this.currentInterval}s`);
            
        } catch (error) {
            console.error('Start tracking error:', error);
            this.updateStatus('Error en tracking', 'inactive');
            this.log(`Error: ${error.message}`);
            this.isTracking = false;
        }
    }

    async getCurrentLocation() {
        return new Promise((resolve, reject) => {
            this.log('Obteniendo ubicación actual...');
            
            navigator.geolocation.getCurrentPosition(
                (position) => {
                    this.currentPosition = position;
                    this.updateLocationDisplay(position);
                    this.sendLocationToServer(position);
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
                    
                    this.log(`Error de ubicación: ${errorMessage}`);
                    reject(new Error(errorMessage));
                },
                {
                    enableHighAccuracy: true,
                    timeout: 15000,
                    maximumAge: 60000
                }
            );
        });
    }

    setupPeriodicTracking() {
        if (this.trackingInterval) {
            clearInterval(this.trackingInterval);
        }
        
        this.trackingInterval = setInterval(async () => {
            try {
                await this.getCurrentLocation();
            } catch (error) {
                this.log(`Error en tracking periódico: ${error.message}`);
            }
        }, this.currentInterval * 1000);
        
        this.log(`Tracking periódico configurado - ${this.currentInterval}s`);
    }

    setupWatchPosition() {
        if (this.watchId) {
            navigator.geolocation.clearWatch(this.watchId);
        }
        
        this.watchId = navigator.geolocation.watchPosition(
            (position) => {
                this.log('Watch position update received');
                this.currentPosition = position;
                this.updateLocationDisplay(position);
                this.sendLocationToServer(position);
            },
            (error) => {
                this.log(`Watch position error: ${error.message}`);
            },
            {
                enableHighAccuracy: true,
                timeout: 30000,
                maximumAge: 10000
            }
        );
        
        this.log('Watch position configurado');
    }

    async sendLocationToServer(position) {
        try {
            const locationData = {
                user_id: `mobile_${this.username}`,
                username: this.username,
                latitude: position.coords.latitude,
                longitude: position.coords.longitude,
                accuracy: position.coords.accuracy,
                timestamp: Date.now()
            };

            this.log(`Enviando ubicación: ${position.coords.latitude.toFixed(6)}, ${position.coords.longitude.toFixed(6)}`);

            const response = await fetch(`${this.serverConfig.apiUrl}/location`, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                },
                body: JSON.stringify(locationData)
            });

            if (response.ok) {
                this.locationCount++;
                this.updateLocationCount();
                this.saveStoredData();
                this.log(`✅ Ubicación enviada (#${this.locationCount})`);
            } else {
                const errorText = await response.text();
                throw new Error(`HTTP ${response.status}: ${errorText}`);
            }

        } catch (error) {
            console.error('Send location error:', error);
            this.log(`❌ Error enviando ubicación: ${error.message}`);
        }
    }

    stopTracking() {
        this.log('Deteniendo tracking...');
        
        this.isTracking = false;
        
        if (this.trackingInterval) {
            clearInterval(this.trackingInterval);
            this.trackingInterval = null;
        }
        
        if (this.watchId) {
            navigator.geolocation.clearWatch(this.watchId);
            this.watchId = null;
        }
        
        this.updateStatus('Standby', 'warning');
        this.log('Tracking detenido correctamente');
    }

    async handleLogout() {
        this.log('Cerrando sesión...');
        
        this.stopTracking();
        
        this.username = '';
        this.locationCount = 0;
        this.startTime = null;
        this.currentPosition = null;
        
        localStorage.removeItem('locationTracker');
        
        this.showLoginForm();
        
        this.vibrate();
        this.log('Sesión cerrada correctamente');
    }

    handleBackgroundToggle(enabled) {
        this.log(`Background tracking ${enabled ? 'enabled' : 'disabled'}`);
        
        if (this.isTracking) {
            this.stopTracking();
            setTimeout(() => this.startTracking(), 1000);
        }
    }


    showMainApp() {
        document.getElementById('mainApp').classList.remove('hidden');
        document.getElementById('userName').textContent = this.deviceId;
        this.updateStatus('Standby', 'warning');
    }

    showLoginForm() {
        return;
    }

    showLoginLoading(show) {
        const loadingEl = document.getElementById('loginLoading');
        const textEl = document.getElementById('loginText');
        
        if (show) {
            loadingEl.classList.remove('hidden');
            textEl.textContent = 'Conectando...';
            document.getElementById('loginBtn').disabled = true;
        } else {
            loadingEl.classList.add('hidden');
            textEl.textContent = 'Iniciar Seguimiento';
            document.getElementById('loginBtn').disabled = false;
        }
    }

    updateStatus(text, type) {
        const statusText = document.getElementById('statusText');
        const statusIndicator = document.getElementById('statusIndicator');
        
        statusText.textContent = text;
        
        statusIndicator.className = 'status-indicator';
        statusIndicator.classList.add(`status-${type}`);
    }

    updateLocationDisplay(position) {
        return;
    }

    updateLocationCount() {
        return;
    }

    log(message) {
        console.log(message);
    }

    showError(message) {
        alert(message);
        this.log(`❌ Error: ${message}`);
    }

    vibrate() {
        try {
            if ('vibrate' in navigator) {
                navigator.vibrate(100);
            }
        } catch (e) {
        }
    }
}

document.addEventListener('DOMContentLoaded', () => {
    console.log('DOM loaded, initializing app...');
    window.locationTracker = new LocationTracker();
});