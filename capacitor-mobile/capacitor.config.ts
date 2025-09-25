import type { CapacitorConfig } from '@capacitor/cli';

const config: CapacitorConfig = {
  appId: 'com.locationtracker.app',
  appName: 'Location Tracker',
  webDir: '.',
  server: {
    androidScheme: 'https'
  },
  plugins: {
    Geolocation: {
      permissions: [
        'ACCESS_COARSE_LOCATION',
        'ACCESS_FINE_LOCATION'
      ]
    }
  }
};

export default config;
