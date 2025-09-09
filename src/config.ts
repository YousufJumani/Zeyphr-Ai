// Frontend configuration
// Change this URL to point to your backend (local or deployed)
export const BACKEND_URL = 'https://dolphin-app-zxvu8.ondigitalocean.app';

// For local development, uncomment the line below:
// export const BACKEND_URL = 'http://localhost:3001';

// API endpoints
export const API_ENDPOINTS = {
  VOICE_CURRENT: `${BACKEND_URL}/api/voice/current`,
  VOICE_SWITCH: `${BACKEND_URL}/api/voice/switch`,
  VOICE_PERFORMANCE: `${BACKEND_URL}/api/voice/performance`,
} as const;

// Socket configuration
export const SOCKET_CONFIG = {
  SERVER_URL: BACKEND_URL,
} as const;

// Force rebuild marker: updated at 2025-09-09 11:45 AM
