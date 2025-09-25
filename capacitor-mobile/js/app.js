class LocationTracker {
    constructor() {
        this.isTracking = false;
        this.username = '';
        this.locationCount = 0;
        this.startTime = null;
        this.trackingInterval = null;
        this.currentInterval = 30; 
        this.backgroundWatchId = null;
        this.currentPosition = null;
        
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
        this.setupEventListeners();
        this.loadStoredData();
        
        await this.waitForCapacitor();
        
        this.setupAppListeners();
        
        this.log('App inicializada correctamente');
    }

    async waitForCapacitor() {
        return new Promise((resolve) => {
            if (Capacitor.isNativePlatform()) {
                setTimeout(resolve, 1000);
            } else {
                resolve();
            }
        });
    }

    setupEventListeners() {
        document.getElementById('loginBtn').addEventListener('click', () => this.handleLogin());
        
        document.getElementById('logoutBtn').addEventListener('click', () => this.handleLogout());
        
        document.getElementById('backgroundTracking').addEventListener('change', (e) => {
            this.handleBackgroundToggle(e.target.checked);
        });
        
        document.getElementById('intervalSelect').addEventListener('change', (e) => {
            this.currentInterval = parseInt(e.target.value);
            this.log(`Intervalo cambiado a ${this.currentInterval}s`);
            
            if (this.isTracking) {
                this.stopTracking();
                setTimeout(() => this.startTracking(), 1000);
            }
        });

        document.getElementById('username').addEventListener('keypress', (e) => {
            if (e.key === 'Enter') {
                this.handleLogin();
            }
        });
    }

    setupAppListeners() {
        App.addListener('appStateChange', ({ isActive }) => {
            this.log(`App state changed: ${isActive ? 'foreground' : 'background'}`);
            
            if (!isActive && this.isTracking) {
                this.log('App en background, manteniendo tracking activo');
            } else if (isActive && this.isTracking) {
                this.log('App en foreground, verificando tracking');
                this.verifyTracking();
            }
        });
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
            const trackingStatus = await this.checkTrackingStatus(username);
            
            if (!trackingStatus.tracking_enabled) {
                this.showError('El tracking está deshabilitado para tu usuario. Contacta al administrador.');
                return;
            }
            
            const permissions = await this.requestLocationPermissions();
            if (!permissions) {
                throw new Error('Permisos de ubicación requeridos');
            }

            this.username = username;
            this.showMainApp();
            this.log(`Usuario ${username} conectado. Esperando órdenes del administrador...`);
            
            this.vibrate();
            
        } catch (error) {
            console.error('Login error:', error);
            this.showError(error.message);
        } finally {
            this.showLoginLoading(false);
        }
    }

    async checkTrackingStatus(username) {
        try {
            this.log('Verificando estado del tracking...');
            
            const response = await fetch(`${this.serverConfig.apiUrl}/user/tracking-status?username=${encodeURIComponent(username)}`);
            
            if (!response.ok) {
                throw new Error(`HTTP ${response.status}: ${await response.text()}`);
            }
            
            const result = await response.json();
            this.log(`Estado del tracking: ${result.tracking_enabled ? 'habilitado' : 'deshabilitado'}`);
            
            return result;
        } catch (error) {
            console.error('Error checking tracking status:', error);
            throw new Error('Error al verificar el estado del tracking: ' + error.message);
        }
    }

    async requestLocationPermissions() {
        try {
            this.log('Solicitando permisos de ubicación...');
            
            const permission = await Geolocation.requestPermissions();
            this.log(`Permisos: ${JSON.stringify(permission)}`);
            
            if (permission.location === 'granted') {
                this.log('Permisos de ubicación concedidos');
                return true;
            } else {
                throw new Error('Permisos de ubicación denegados');
            }
        } catch (error) {
            console.error('Permission error:', error);
            throw new Error('Error al solicitar permisos: ' + error.message);
        }
    }

    async startTracking() {
        if (this.isTracking) return;
        
        try {
            const trackingStatus = await this.checkTrackingStatus(this.username);
            
            if (!trackingStatus.tracking_enabled) {
                this.updateStatus('Tracking deshabilitado por admin', 'inactive');
                this.log('❌ Tracking deshabilitado por el administrador');
                return;
            }
        } catch (error) {
            this.log(`⚠️ No se pudo verificar el estado del tracking: ${error.message}`);
            return;
        }
        
        this.log('Iniciando tracking por orden del administrador...');
        this.isTracking = true;
        this.startTime = Date.now();
        
        this.updateStatus('Iniciando tracking...', 'warning');
        
        try {
            await this.getCurrentLocation();
            
            this.setupPeriodicTracking();
            
            this.setupBackgroundTracking();
            
            this.updateStatus('Tracking activo (Admin)', 'active');
            this.log(`Tracking iniciado por admin - Intervalo: ${this.currentInterval}s`);
            
        } catch (error) {
            console.error('Start tracking error:', error);
            this.updateStatus('Error en tracking', 'inactive');
            this.log(`Error: ${error.message}`);
            this.isTracking = false;
        }
    }

    async getCurrentLocation() {
        try {
            this.log('Obteniendo ubicación actual...');
            
            const position = await Geolocation.getCurrentPosition({
                enableHighAccuracy: true,
                timeout: 15000,
                maximumAge: 0
            });
            
            this.currentPosition = position;
            this.updateLocationDisplay(position);
            
            await this.sendLocationToServer(position);
            
            return position;
            
        } catch (error) {
            console.error('Get location error:', error);
            throw new Error('No se pudo obtener la ubicación: ' + error.message);
        }
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

    async setupBackgroundTracking() {
        try {
            this.backgroundWatchId = await Geolocation.watchPosition({
                enableHighAccuracy: true,
                timeout: 30000,
                maximumAge: 10000
            }, (position) => {
                this.log('Background location received');
                this.currentPosition = position;
                this.updateLocationDisplay(position);
                this.sendLocationToServer(position);
            }, (error) => {
                this.log(`Background tracking error: ${error.message}`);
            });
            
            this.log('Background tracking configurado');
            
        } catch (error) {
            this.log(`Error configurando background tracking: ${error.message}`);
        }
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
        
        if (this.backgroundWatchId) {
            Geolocation.clearWatch({ id: this.backgroundWatchId });
            this.backgroundWatchId = null;
        }
        
        this.updateStatus('Tracking detenido', 'inactive');
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

    async verifyTracking() {
        if (this.isTracking && !this.trackingInterval) {
            this.log('Tracking inconsistente, reiniciando...');
            await this.startTracking();
        }
    }

    showLoginForm() {
        document.getElementById('loginForm').classList.remove('hidden');
        document.getElementById('mainApp').classList.add('hidden');
        document.getElementById('username').value = '';
        document.getElementById('username').focus();
    }

    showMainApp() {
        document.getElementById('loginForm').classList.add('hidden');
        document.getElementById('mainApp').classList.remove('hidden');
        document.getElementById('userName').textContent = this.username;
        this.updateLocationCount();
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
        const locationInfo = document.getElementById('locationInfo');
        const lat = position.coords.latitude.toFixed(6);
        const lng = position.coords.longitude.toFixed(6);
        const accuracy = position.coords.accuracy ? `±${position.coords.accuracy.toFixed(0)}m` : '';
        
        locationInfo.innerHTML = `📍 ${lat}, ${lng} ${accuracy}`;
    }

    updateLocationCount() {
        document.getElementById('locationCount').textContent = this.locationCount;
        
        if (this.startTime) {
            const uptime = Math.floor((Date.now() - this.startTime) / 1000);
            const minutes = Math.floor(uptime / 60);
            const seconds = uptime % 60;
            document.getElementById('uptime').textContent = 
                `${minutes.toString().padStart(2, '0')}:${seconds.toString().padStart(2, '0')}`;
        }
    }

    log(message) {
        console.log(message);
        
        const logContainer = document.getElementById('activityLog');
        const time = new Date().toLocaleTimeString();
        const logEntry = document.createElement('div');
        logEntry.innerHTML = `<strong>${time}</strong> ${message}`;
        
        logContainer.appendChild(logEntry);
        logContainer.scrollTop = logContainer.scrollHeight;
        
        while (logContainer.children.length > 50) {
            logContainer.removeChild(logContainer.firstChild);
        }
    }

    showError(message) {
        alert(message); 
        this.log(`❌ Error: ${message}`);
    }

    async vibrate() {
        try {
            if (Capacitor.isNativePlatform()) {
                await Haptics.impact({ style: ImpactStyle.Light });
            }
        } catch (e) {
        }
    }
}

document.addEventListener('DOMContentLoaded', () => {
    console.log('DOM loaded, initializing app...');
    window.locationTracker = new LocationTracker();
});