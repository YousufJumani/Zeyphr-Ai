import { io, Socket } from 'socket.io-client';

// Singleton socket wrapper with reference counting to survive StrictMode/HMR
let socket: Socket | null = null;
let isSocketConnected = false;
let initCount = 0;
let eventsRegistered = false;
let lastInitTime = 0; // Track when socket was last initialized

// External handlers (set by the consumer)
let aiResponseHandler: ((text: string) => void) | null = null;
let aiAudioHandler: ((audio: string) => void) | null = null;
let readyToListenHandler: (() => void) | null = null;
let errorHandler: ((message: string) => void) | null = null;

const SERVER_URL = 'http://localhost:3001';

export const initSocket = (): Socket | null => {
  initCount += 1;
  lastInitTime = Date.now(); // Record init time

  if (socket && socket.connected) {
    console.log('[Socket] ⚠️ Socket already connected, initCount =', initCount);
    return socket;
  }

  if (!socket) {
    console.log('[Socket] 🔌 Creating new socket instance...');
    socket = io(SERVER_URL, {
      reconnectionAttempts: 3,
      reconnectionDelay: 1000,
      timeout: 5000,
      autoConnect: true,
      transports: ['websocket', 'polling'],
      upgrade: true,
      withCredentials: false
    });
  } else {
    console.log('[Socket] ⚠️ Reusing existing socket instance (will attempt reconnect)');
  }

  if (!eventsRegistered && socket) {
    eventsRegistered = true;

    socket.on('connect', () => {
      console.log('[Socket] ✅ Connected, id=', socket?.id);
      isSocketConnected = true;
    });

    socket.on('disconnect', (reason: string) => {
      console.log('[Socket] ❌ Disconnected:', reason);
      isSocketConnected = false;
    });

    socket.on('connect_error', (error: any) => {
      console.error('[Socket] ❌ Connection error:', error?.message || error);
      if (errorHandler) errorHandler(`Connection failed: ${error?.message || error}`);
      isSocketConnected = false;
    });

    socket.on('reconnect_attempt', (attemptNumber: number) => {
      console.log('[Socket] 🔄 Reconnect attempt', attemptNumber);
    });

    socket.on('reconnect', (attemptNumber: number) => {
      console.log('[Socket] ✅ Reconnected after attempts:', attemptNumber);
      isSocketConnected = true;
    });

    socket.on('reconnect_failed', () => {
      console.error('[Socket] ❌ Reconnect failed');
      isSocketConnected = false;
      if (errorHandler) errorHandler('Failed to reconnect to server');
    });

    socket.on('aiResponse', (data: { text: string }) => {
      if (aiResponseHandler) aiResponseHandler(data.text);
    });

    socket.on('aiAudio', (data: { audio: string }) => {
      if (aiAudioHandler) aiAudioHandler(data.audio);
    });

    socket.on('readyToListen', () => {
      if (readyToListenHandler) readyToListenHandler();
    });

    socket.on('error', (data: { message?: string }) => {
      if (errorHandler) errorHandler(data?.message || 'Server error');
    });
  }

  return socket;
};

export const startSession = (): boolean => {
  if (!socket || !isSocketConnected) {
    if (errorHandler) errorHandler('Socket not connected');
    return false;
  }
  socket.emit('startSession');
  return true;
};

export const sendSpeech = (text: string): boolean => {
  if (!socket || !isSocketConnected) {
    if (errorHandler) errorHandler('Socket not connected');
    return false;
  }
  if (!text || !text.trim()) return false;
  socket.emit('userSpeech', { text: text.trim() });
  return true;
};

export const interruptAI = (): boolean => {
  if (!socket || !isSocketConnected) return false;
  socket.emit('interruptAI');
  return true;
};

export const notifySpeechDetected = (): boolean => {
  if (!socket || !isSocketConnected) return false;
  socket.emit('speechDetected');
  return true;
};

export const endSession = (): boolean => {
  if (!socket || !isSocketConnected) return false;
  socket.emit('endSession');
  return true;
};

export const isConnected = (): boolean => {
  return !!socket && isSocketConnected && socket.connected === true;
};

export const disconnect = (): void => {
  initCount = Math.max(0, initCount - 1);
  if (initCount > 0) return; // other consumers still need it

  // If socket was initialized very recently (< 2 seconds), delay disconnect to allow connection
  const timeSinceInit = Date.now() - lastInitTime;
  if (timeSinceInit < 2000 && socket && !socket.connected) {
    console.log('[Socket] ⏳ Delaying disconnect - socket was recently initialized');
    setTimeout(() => {
      if (socket && !socket.connected) {
        console.log('[Socket] 🔌 Delayed disconnect - socket still not connected');
        try {
          socket.disconnect();
        } catch (e) {
          // ignore
        }
        socket = null;
        isSocketConnected = false;
        eventsRegistered = false;
        aiResponseHandler = null;
        aiAudioHandler = null;
        readyToListenHandler = null;
        errorHandler = null;
      }
    }, 2000);
    return;
  }

  if (socket) {
    try {
      console.log('[Socket] 🔌 Actually disconnecting socket (no consumers)');
      socket.disconnect();
    } catch (e) {
      // ignore
    }
  }

  socket = null;
  isSocketConnected = false;
  eventsRegistered = false;
  aiResponseHandler = null;
  aiAudioHandler = null;
  readyToListenHandler = null;
  errorHandler = null;
};

export const onAiResponse = (handler: (text: string) => void): void => {
  aiResponseHandler = handler;
};

export const onAiAudio = (handler: (audio: string) => void): void => {
  aiAudioHandler = handler;
};

export const onReadyToListen = (handler: () => void): void => {
  readyToListenHandler = handler;
};

export const onError = (handler: (message: string) => void): void => {
  errorHandler = handler;
};

export const getSocketId = (): string | null => socket?.id || null;

export const getConnectionState = () => ({
  connected: isSocketConnected,
  socketExists: !!socket,
  socketConnected: !!socket?.connected,
  transport: (socket as any)?.io?.engine?.transport?.name || 'unknown'
});

export const setupEnhancedSocket = (
  onAiResp: (text: string) => void,
  onAiAud: (audioBase64: string) => void,
  onErr: (message: string) => void,
  onReady?: () => void
) => {
  initSocket();
  onAiResponse(onAiResp);
  onAiAudio(onAiAud);
  onError(onErr);
  if (onReady) onReadyToListen(onReady);

  return {
    startSession,
    sendSpeech,
    interruptAI,
    disconnect,
    isConnected,
    getSocketId,
    getConnectionState
  } as const;
};

export type EnhancedSocketMethods = ReturnType<typeof setupEnhancedSocket>;
