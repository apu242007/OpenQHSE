import { ExpoConfig, ConfigContext } from 'expo/config';

export default ({ config }: ConfigContext): ExpoConfig => ({
  ...config,
  name: 'OpenQHSE',
  slug: 'openqhse-mobile',
  version: '0.1.0',
  orientation: 'portrait',
  icon: './assets/icon.png',
  scheme: 'openqhse',
  userInterfaceStyle: 'automatic',

  splash: {
    image: './assets/splash.png',
    resizeMode: 'contain',
    backgroundColor: '#0f172a',
  },

  assetBundlePatterns: ['**/*'],

  ios: {
    supportsTablet: true,
    bundleIdentifier: 'com.openqhse.mobile',
    buildNumber: '1',
    config: {
      usesNonExemptEncryption: false,
    },
    infoPlist: {
      NSCameraUsageDescription:
        'OpenQHSE necesita acceso a la cámara para capturar evidencia fotográfica de inspecciones e incidentes.',
      NSPhotoLibraryUsageDescription:
        'OpenQHSE necesita acceso a la galería para adjuntar fotos existentes como evidencia.',
      NSLocationWhenInUseUsageDescription:
        'OpenQHSE necesita tu ubicación para registrar la geo-referencia de inspecciones e incidentes.',
      NSLocationAlwaysAndWhenInUseUsageDescription:
        'OpenQHSE necesita tu ubicación en segundo plano para permisos de trabajo activos.',
      NSMicrophoneUsageDescription:
        'OpenQHSE necesita acceso al micrófono para grabar notas de voz en inspecciones.',
      NFCReaderUsageDescription:
        'OpenQHSE utiliza NFC para leer tags de equipos y permisos de trabajo.',
    },
  },

  android: {
    adaptiveIcon: {
      foregroundImage: './assets/adaptive-icon.png',
      backgroundColor: '#0f172a',
    },
    package: 'com.openqhse.mobile',
    versionCode: 1,
    permissions: [
      'CAMERA',
      'ACCESS_FINE_LOCATION',
      'ACCESS_COARSE_LOCATION',
      'ACCESS_BACKGROUND_LOCATION',
      'RECORD_AUDIO',
      'NFC',
      'VIBRATE',
      'RECEIVE_BOOT_COMPLETED',
      'READ_EXTERNAL_STORAGE',
      'WRITE_EXTERNAL_STORAGE',
    ],
    intentFilters: [
      {
        action: 'VIEW',
        autoVerify: true,
        data: [
          { scheme: 'openqhse' },
          { scheme: 'https', host: '*.openqhse.com', pathPrefix: '/qr/' },
        ],
        category: ['BROWSABLE', 'DEFAULT'],
      },
    ],
  },

  web: {
    bundler: 'metro',
    favicon: './assets/favicon.png',
  },

  plugins: [
    'expo-dev-client',
    '@nozbe/watermelondb/expo-plugin',
    'expo-router',
    'expo-font',
    'expo-secure-store',
    [
      'expo-camera',
      {
        cameraPermission:
          'Permitir a OpenQHSE usar la cámara para capturar evidencia.',
      },
    ],
    [
      'expo-location',
      {
        locationAlwaysAndWhenInUsePermission:
          'Permitir a OpenQHSE acceder a tu ubicación para geo-referencia.',
        locationAlwaysPermission:
          'Permitir a OpenQHSE acceder a tu ubicación en segundo plano.',
        locationWhenInUsePermission:
          'Permitir a OpenQHSE acceder a tu ubicación.',
      },
    ],
    [
      'expo-notifications',
      {
        icon: './assets/notification-icon.png',
        color: '#3b82f6',
        sounds: ['./assets/sounds/notification.wav'],
      },
    ],
    [
      'expo-nfc-manager',
      {
        nfcPermission:
          'La app necesita NFC para escanear etiquetas de seguridad',
      },
    ],
    // expo-barcode-scanner fue deprecado en SDK 50 y eliminado en SDK 51.
    // Los códigos QR/barras se leen con expo-camera usando BarcodeScanner integrado.
    'expo-av',
  ],

  experiments: {
    typedRoutes: true,
  },

  updates: {
    enabled: true,
    fallbackToCacheTimeout: 30000,
    url: 'https://u.expo.dev/openqhse-mobile',
  },

  runtimeVersion: {
    policy: 'appVersion',
  },

  extra: {
    eas: {
      projectId: 'openqhse-mobile',
    },
    apiBaseUrl: process.env.EXPO_PUBLIC_API_URL || 'http://localhost:8000/api/v1',
    aiBaseUrl: process.env.EXPO_PUBLIC_AI_URL || 'http://localhost:8100',
  },
});
