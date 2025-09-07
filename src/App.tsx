import React, { useState, useEffect, useRef, useCallback } from 'react';
import Chat from './components/Chat';
import VoiceVisualizer from './components/VoiceVisualizer';
import VoiceSelector from './components/VoiceSelector';
import './modern-styles.css';
import { 
  initSocket, 
  startSession as socketStartSession, 
  sendSpeech, 
  interruptAI as socketInterruptAI,
  endSession as socketEndSession,
  onAiResponse,
  onAiAudio,
  onReadyToListen,
  onError,
  isConnected as socketIsConnected,
  disconnect
} from './socket-enhanced';

// Define message type
interface Message {
  id: string;
  text: string;
  sender: 'user' | 'therapist';
  timestamp: number;
}

const App: React.FC = () => {
  // State variables
  const [messages, setMessages] = useState<Message[]>([]);
  const [isSessionActive, setIsSessionActive] = useState(false);
  const [isListening, setIsListening] = useState(false);
  const [isSpeaking, setIsSpeaking] = useState(false);
  const [status, setStatus] = useState<string>('Welcome to your therapy session');
  const [isConnected, setIsConnected] = useState(false);
  const [autoInterruptEnabled, setAutoInterruptEnabled] = useState(false); // New state for toggle
  
  // Refs
  const recognitionRef = useRef<SpeechRecognition | null>(null);
  const audioContextRef = useRef<AudioContext | null>(null);
  const audioSourceRef = useRef<MediaStreamAudioSourceNode | null>(null);
  const aiAudioAnalyserRef = useRef<AnalyserNode | null>(null);
  const userAnalyserRef = useRef<AnalyserNode | null>(null);
  const currentAudioSourceRef = useRef<AudioBufferSourceNode | null>(null);
  const userMediaStreamRef = useRef<MediaStream | null>(null);
  const socketInitializedRef = useRef(false);
  const isStartingRecognitionRef = useRef(false); // Track if we're currently starting recognition
  const gainNodeRef = useRef<GainNode | null>(null); // Add gain control for microphone

  // Initialize web audio context
  useEffect(() => {
    const initAudioContext = async () => {
      try {
        audioContextRef.current = new (window.AudioContext || (window as any).webkitAudioContext)();
        
        // Resume audio context if it's suspended (required by some browsers)
        if (audioContextRef.current.state === 'suspended') {
          await audioContextRef.current.resume();
        }
      } catch (error) {
        console.error('[Audio] Failed to initialize audio context:', error);
      }
    };
    
    initAudioContext();
    
    return () => {
      if (audioContextRef.current) {
        audioContextRef.current.close();
      }
      if (userMediaStreamRef.current) {
        userMediaStreamRef.current.getTracks().forEach(track => track.stop());
      }
    };
  }, []);

    useEffect(() => {
      if (socketInitializedRef.current) return;
      socketInitializedRef.current = true;

      initSocket();

      // Cleanup function
      return () => {
        disconnect();
      };
    }, []);

    // Set up socket event listeners once
    useEffect(() => {
      onAiResponse((text: string) => {
        addMessage(text, 'therapist');
      });

      onAiAudio((audioBase64: string) => {
        playAudioFromBase64(audioBase64);
        setIsSpeaking(true);
      });

      onError((errorMessage: string) => {
        console.error('[Frontend] ❌ Socket error:', errorMessage);
        setStatus(`Error: ${errorMessage} - Attempting recovery...`);
        // Try to recover from error
        setTimeout(() => {
          setStatus('Recovered. You can continue...');
        }, 2000);
      });

    onReadyToListen(() => {
      if (autoInterruptEnabled) {
        // Auto-interrupt ON: Start listening immediately to enable interruption
        if (recognitionRef.current && !isStartingRecognitionRef.current) {
          setStatus('Ready to listen');
          // Stop any existing recognition first
          try {
            recognitionRef.current.stop();
          } catch (e) {
            // Ignore if already stopped
          }

          // Wait for stop to complete, then restart
          setTimeout(() => {
            restartSpeechRecognition();
          }, 500);
        }
      } else {
        // Auto-interrupt OFF: Only start if AI is not speaking
        if (!isSpeaking && recognitionRef.current && !isStartingRecognitionRef.current) {
          setStatus('Ready to listen');
          // Stop any existing recognition first
          try {
            recognitionRef.current.stop();
          } catch (e) {
            // Ignore if already stopped
          }

          // Wait for stop to complete, then restart
          setTimeout(() => {
            restartSpeechRecognition();
          }, 500);
        } else if (isSpeaking) {
          setStatus('AI is speaking');
        } else {
          setStatus('Ready to listen');
        }
      }
    });      // Cleanup: replace handlers with no-ops to avoid holding references
      return () => {
        onAiResponse(() => {});
        onAiAudio(() => {});
        onError(() => {});
        onReadyToListen(() => {});
      };
    }, []);

    // Check connection status periodically
    useEffect(() => {
      const connectionChecker = setInterval(() => {
        const connected = socketIsConnected();
        
        setIsConnected(connected);
        if (connected && !isSessionActive) {
          setStatus('Connected - Ready to start your session');
        } else if (!connected && !isSessionActive) {
          setStatus('Connecting...');
        }
        
        // Also check speech recognition status during active session
        if (isSessionActive && recognitionRef.current && !isListening && !isStartingRecognitionRef.current) {
          // Handle differently based on auto-interrupt setting
          if (autoInterruptEnabled) {
            // Auto-interrupt ON: Always try to start listening
            restartSpeechRecognition();
          } else {
            // Auto-interrupt OFF: Only start if AI is not speaking
            if (!isSpeaking) {
              restartSpeechRecognition();
            }
          }
        }
      }, 2000);

      return () => {
        clearInterval(connectionChecker);
      };
    }, [isSessionActive, isListening, isSpeaking]);

  // Initialize speech recognition (simplified)
  useEffect(() => {
    const SpeechRecognition = window.SpeechRecognition || (window as any).webkitSpeechRecognition;
    if (!SpeechRecognition) {
      setStatus('Speech recognition not supported in this browser');
      return;
    }

    const recognition = new SpeechRecognition();
    recognition.continuous = true;
    recognition.interimResults = false; // Simplified - no interim results
    recognition.lang = 'en-US';
    recognition.maxAlternatives = 1;

    recognitionRef.current = recognition;

    recognition.onstart = () => {
      setIsListening(true);
      setStatus('Listening...');
      isStartingRecognitionRef.current = false;
    };

    recognition.onresult = (event: SpeechRecognitionEvent) => {
      const transcript = event.results[event.results.length - 1][0].transcript.trim();

      if (transcript) {
        addMessage(transcript, 'user');

        // If auto-interrupt is ON and AI is speaking, interrupt the AI
        if (autoInterruptEnabled && isSpeaking) {
          // Stop current audio if playing
          if (currentAudioSourceRef.current) {
            try {
              currentAudioSourceRef.current.stop();
              currentAudioSourceRef.current.disconnect();
            } catch (e) {
              // Audio already stopped
            }
            currentAudioSourceRef.current = null;
          }
          socketInterruptAI();
          setIsSpeaking(false);
          setStatus('Interrupted. Processing...');
        } else {
          setStatus('Processing...');
        }

        // Send to backend
        sendSpeech(transcript);
      }
    };

    recognition.onerror = (event: SpeechRecognitionErrorEvent) => {
      console.error('[SpeechRecognition] Error:', event.error);
      setIsListening(false);

      if (event.error === 'not-allowed') {
        setStatus('Microphone access denied');
        setIsSessionActive(false);
      } else if (event.error === 'aborted') {
        // Aborted errors are usually harmless - restart based on conditions
        if (isSessionActive && (!isSpeaking || autoInterruptEnabled) && !isStartingRecognitionRef.current) {
          restartSpeechRecognition();
        }
      } else if (isSessionActive && (!isSpeaking || autoInterruptEnabled) && !isStartingRecognitionRef.current) {
        // Auto-restart on other errors if conditions allow
        restartSpeechRecognition();
      }
    };

    recognition.onend = () => {
      setIsListening(false);

      // Auto-restart based on auto-interrupt setting
      if (isSessionActive && (!isSpeaking || autoInterruptEnabled)) {
        restartSpeechRecognition();
      }
    };

  }, []); // Only run once

  // Helper to add messages to the chat
  const addMessage = (text: string, sender: 'user' | 'therapist') => {
    const newMessage: Message = {
      id: Date.now().toString(),
      text,
      sender,
      timestamp: Date.now()
    };
    setMessages(prevMessages => [...prevMessages, newMessage]);
  };

  // Helper function to safely restart speech recognition
  const restartSpeechRecognition = useCallback(() => {
    // If auto-interrupt is OFF, NEVER start while AI is speaking
    if (!recognitionRef.current || !isSessionActive || isStartingRecognitionRef.current || isListening ||
        (isSpeaking && !autoInterruptEnabled)) {
      return;
    }

    isStartingRecognitionRef.current = true;

    setTimeout(() => {
      if (recognitionRef.current && isSessionActive && !isListening &&
          (!isSpeaking || autoInterruptEnabled)) {
        try {
          recognitionRef.current.start();
        } catch (e) {
          console.error('Error restarting recognition:', e);
          isStartingRecognitionRef.current = false;
        }
      } else {
        isStartingRecognitionRef.current = false;
      }
    }, 100);
  }, [isSessionActive, isListening, isSpeaking, autoInterruptEnabled]);

  // Simplified audio playback
  const playAudioFromBase64 = (base64Audio: string) => {
    try {
      const audioContext = audioContextRef.current;
      if (!audioContext) {
        console.error('No audio context available');
        return;
      }

      // Stop current audio
      if (currentAudioSourceRef.current) {
        currentAudioSourceRef.current.stop();
        currentAudioSourceRef.current = null;
      }

      // Decode and play
      const binaryString = atob(base64Audio);
      const bytes = new Uint8Array(binaryString.length);
      for (let i = 0; i < binaryString.length; i++) {
        bytes[i] = binaryString.charCodeAt(i);
      }

      audioContext.decodeAudioData(bytes.buffer.slice()).then((buffer) => {
        const source = audioContext.createBufferSource();
        source.buffer = buffer;

        // Create analyser for AI audio visualization
        if (!aiAudioAnalyserRef.current) {
          aiAudioAnalyserRef.current = audioContext.createAnalyser();
          aiAudioAnalyserRef.current.fftSize = 256;
          aiAudioAnalyserRef.current.smoothingTimeConstant = 0.8;
        }

        // Connect: source -> analyser -> destination
        source.connect(aiAudioAnalyserRef.current);
        aiAudioAnalyserRef.current.connect(audioContext.destination);

        source.onended = () => {
          setIsSpeaking(false);
          currentAudioSourceRef.current = null;

          // Handle differently based on auto-interrupt setting
          if (autoInterruptEnabled) {
            // Auto-interrupt ON: AI finished without interruption
            setStatus('AI finished speaking');
          } else {
            // Auto-interrupt OFF: Auto-start listening after AI finishes
            setStatus('AI finished speaking');
            // Add a small delay to ensure no overlap between TTS end and speech recognition start
            setTimeout(() => {
              restartSpeechRecognition();
            }, 300);
          }
        };

        currentAudioSourceRef.current = source;
        setIsSpeaking(true);
        setStatus('Speaking...');

        // If auto-interrupt is ON, start speech recognition immediately to enable interruption
        if (autoInterruptEnabled) {
          setTimeout(() => {
            restartSpeechRecognition();
          }, 100); // Small delay to ensure TTS has started
        }

        source.start(0);
      }).catch((decodeError) => {
        console.error('Audio decode error:', decodeError);
        setIsSpeaking(false);
      });
    } catch (error) {
      console.error('Audio playback error:', error);
      setIsSpeaking(false);
    }
  };

  // Start session: Play greeting and start recording
  const startSession = async () => {
    setIsSessionActive(true);
    setStatus('Starting your therapeutic session...');

    try {
      // Get microphone access with reduced constraints to prevent feedback
      const stream = await navigator.mediaDevices.getUserMedia({ 
        audio: {
          echoCancellation: true,
          noiseSuppression: true,
          autoGainControl: false, // Disable AGC to prevent feedback
          sampleRate: 44100,
          channelCount: 1
        }
      });
      userMediaStreamRef.current = stream;

      // Create audio source for visualizer
      if (audioContextRef.current) {
        audioSourceRef.current = audioContextRef.current.createMediaStreamSource(stream);

        // Create gain node to reduce microphone sensitivity and prevent feedback
        if (!gainNodeRef.current) {
          gainNodeRef.current = audioContextRef.current.createGain();
          gainNodeRef.current.gain.value = 0.3; // Reduce gain to 30% to prevent feedback
        }

        // Connect: source -> gain -> analyser
        audioSourceRef.current.connect(gainNodeRef.current);

        // Create analyser for user audio visualization
        if (!userAnalyserRef.current) {
          userAnalyserRef.current = audioContextRef.current.createAnalyser();
          userAnalyserRef.current.fftSize = 256;
          userAnalyserRef.current.smoothingTimeConstant = 0.8;
          gainNodeRef.current.connect(userAnalyserRef.current);
        }
      }

      // Start the session on backend
      if (socketIsConnected()) {
        socketStartSession();
      } else {
        setStatus('Connection error - please refresh the page');
        setIsSessionActive(false);
      }

    } catch (error) {
      console.error('Error starting session:', error);
      setStatus('Please allow microphone access to continue');
      setIsSessionActive(false);
    }
  };

  // End session
  const endSession = () => {
    // Notify backend to stop all processes
    socketEndSession();

    setIsSessionActive(false);
    setIsListening(false);
    setIsSpeaking(false);
    setStatus('Session ended. Take care of yourself.');

    // Stop current TTS audio immediately
    if (currentAudioSourceRef.current) {
      currentAudioSourceRef.current.stop();
      currentAudioSourceRef.current = null;
    }

    // Interrupt any ongoing AI response
    socketInterruptAI();

    // Stop speech recognition
    if (recognitionRef.current) {
      try {
        recognitionRef.current.stop();
      } catch (e) {
        // Recognition already stopped
      }
    }

    // Clean up audio resources
    if (userMediaStreamRef.current) {
      userMediaStreamRef.current.getTracks().forEach(track => track.stop());
      userMediaStreamRef.current = null;
    }

    audioSourceRef.current = null;
    aiAudioAnalyserRef.current = null;
    userAnalyserRef.current = null;
    gainNodeRef.current = null;

    // Clear messages for a fresh start
    setMessages([]);

    // Clear status after a moment
    setTimeout(() => {
      setStatus('Welcome to your therapy session');
    }, 3000);
  };

  // Interrupt AI response
  const handleInterrupt = () => {
    // Stop current audio if playing
    if (currentAudioSourceRef.current) {
      try {
        currentAudioSourceRef.current.stop();
        currentAudioSourceRef.current.disconnect();
      } catch (e) {
        // Audio already stopped
      }
      currentAudioSourceRef.current = null;
    }

    socketInterruptAI();
    setIsSpeaking(false);
    setStatus('I\'m listening...');

    // Always start listening immediately after manual interrupt, regardless of auto-interrupt setting
    setTimeout(() => {
      restartSpeechRecognition();
    }, 200); // Small delay to ensure TTS is fully stopped
  };

  return (
    <div className="modern-app">
      {/* Hero Section */}
      <section className="hero-section">
        <div className="hero-content">
          <div className="brand-area">
            <h1 className="brand-title">Zeyphr</h1>
            <p className="brand-subtitle">Your space for thoughtful conversation</p>
          </div>
          
          {/* Voice Selector - Top Right */}
          <div className="voice-controls">
            <VoiceSelector 
              onVoiceChange={(gender) => {
                setStatus(`Voice switched to ${gender} therapist`);
                setTimeout(() => setStatus('Ready to continue your session'), 2000);
              }}
              disabled={isSessionActive}
            />
            
            {/* Auto-interrupt toggle */}
            <button 
              className={`toggle-btn ${autoInterruptEnabled ? 'enabled' : 'disabled'}`}
              onClick={() => setAutoInterruptEnabled(!autoInterruptEnabled)}
              title={autoInterruptEnabled ? 'Interrupt AI when you speak' : 'Wait for AI to finish speaking'}
            >
              <span className="toggle-icon">⚡</span>
              <span className="toggle-text">
                {autoInterruptEnabled ? 'Interrupt ON' : 'Interrupt OFF'}
              </span>
            </button>
          </div>
        </div>
      </section>

      {/* Main Interaction Area */}
      <section className="interaction-section">
        <div className="interaction-container">
          
          {/* Voice Visualizer - Center Stage */}
          <div className="visualizer-area">
            <VoiceVisualizer 
              userAudioContext={audioContextRef.current}
              userAudioSource={audioSourceRef.current}
              userAudioAnalyser={userAnalyserRef.current}
              aiAudioAnalyser={aiAudioAnalyserRef.current}
              isListening={isListening}
              isSpeaking={isSpeaking}
            />
          </div>

          {/* Status Display */}
          <div className="status-area">
            {status && (
              <div className={`status-display ${
                status.includes('Error') || status.includes('issue') ? 'error' : 
                status.includes('Ready') || status.includes('listening') ? 'success' : 
                status.includes('Processing') ? 'processing' : ''
              }`}>
                <span className="status-text">{status}</span>
              </div>
            )}
          </div>

          {/* Main Control */}
          <div className="main-control">
            <button 
              className={`session-btn ${isSessionActive ? 'active' : 'inactive'}`} 
              onClick={isSessionActive ? endSession : startSession}
              disabled={!isConnected}
            >
              <div className="btn-content">
                <span className="btn-icon">
                  {isSessionActive ? '⏹' : '▶'}
                </span>
                <span className="btn-text">
                  {isSessionActive ? 'End Session' : 'Start Session'}
                </span>
              </div>
            </button>
            
            {/* Interrupt button - only show when AI is speaking */}
            {isSpeaking && (
              <button 
                className="interrupt-btn"
                onClick={handleInterrupt}
              >
                <span className="interrupt-icon">⏸</span>
                <span className="interrupt-text">Stop AI</span>
              </button>
            )}

            {/* Continue Listening button - show when auto-interrupt is enabled and AI finished but not listening */}
            {false && autoInterruptEnabled && !isSpeaking && !isListening && isSessionActive && (
              <button 
                className="continue-btn"
                onClick={() => {
                  setStatus('Listening...');
                  restartSpeechRecognition();
                }}
              >
                <span className="continue-icon">🎤</span>
                <span className="continue-text">Start Listening</span>
              </button>
            )}
          </div>
        </div>
      </section>

      {/* Minimal Chat Area */}
      <section className="chat-section">
        <div className="chat-container">
          <Chat messages={messages} />
        </div>
      </section>
    </div>
  );
};

export default App;
