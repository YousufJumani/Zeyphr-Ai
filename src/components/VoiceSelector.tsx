import React, { useState, useEffect } from 'react';

interface VoiceConfig {
  gender: 'male' | 'female';
  name: string;
  style: string;
  performanceMode: 'fast' | 'balanced' | 'quality';
  description: string;
}

interface VoiceSelectorProps {
  onVoiceChange?: (gender: 'male' | 'female') => void;
  onPerformanceModeChange?: (mode: 'fast' | 'balanced' | 'quality') => void;
  disabled?: boolean;
}

const VoiceSelector: React.FC<VoiceSelectorProps> = ({
  onVoiceChange,
  onPerformanceModeChange,
  disabled = false
}) => {
  const [currentVoice, setCurrentVoice] = useState<'male' | 'female'>('female');
  const [currentPerformanceMode, setCurrentPerformanceMode] = useState<'fast' | 'balanced' | 'quality'>('balanced');
  const [isLoading, setIsLoading] = useState(false);
  const [voiceConfig, setVoiceConfig] = useState<VoiceConfig | null>(null);

  // Load current voice configuration on mount
  useEffect(() => {
    loadCurrentVoice();
  }, []);

  const loadCurrentVoice = async () => {
    try {
      const response = await fetch('http://localhost:3001/api/voice/current');
      const data = await response.json();

      if (data.success) {
        setCurrentVoice(data.voiceConfig.gender);
        setCurrentPerformanceMode(data.voiceConfig.performanceMode);
        setVoiceConfig(data.voiceConfig);
        console.log('[VoiceSelector] Current voice loaded:', data.voiceConfig);
      }
    } catch (error) {
      console.error('[VoiceSelector] Error loading current voice:', error);
    }
  };

  const switchVoice = async (gender: 'male' | 'female') => {
    if (isLoading || disabled) return;

    setIsLoading(true);
    console.log(`[VoiceSelector] Switching to ${gender} voice...`);

    try {
      const response = await fetch('http://localhost:3001/api/voice/switch', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ gender })
      });

      const data = await response.json();

      if (data.success) {
        setCurrentVoice(gender);
        setVoiceConfig(data.voiceConfig);
        console.log(`[VoiceSelector] ✅ Voice switched to ${gender}:`, data.voiceConfig.name);

        if (onVoiceChange) {
          onVoiceChange(gender);
        }
      } else {
        console.error('[VoiceSelector] Failed to switch voice:', data.message);
      }
    } catch (error) {
      console.error('[VoiceSelector] Error switching voice:', error);
    } finally {
      setIsLoading(false);
    }
  };

  const switchPerformanceMode = async (mode: 'fast' | 'balanced' | 'quality') => {
    if (isLoading || disabled) return;

    setIsLoading(true);
    console.log(`[VoiceSelector] Switching to ${mode} performance mode...`);

    try {
      const response = await fetch('http://localhost:3001/api/voice/performance', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ mode })
      });

      const data = await response.json();

      if (data.success) {
        setCurrentPerformanceMode(mode);
        setVoiceConfig(data.voiceConfig);
        console.log(`[VoiceSelector] ✅ Performance mode switched to ${mode}`);

        if (onPerformanceModeChange) {
          onPerformanceModeChange(mode);
        }
      } else {
        console.error('[VoiceSelector] Failed to switch performance mode:', data.message);
      }
    } catch (error) {
      console.error('[VoiceSelector] Error switching performance mode:', error);
    } finally {
      setIsLoading(false);
    }
  };

  const getPerformanceModeDescription = (mode: 'fast' | 'balanced' | 'quality') => {
    switch (mode) {
      case 'fast':
        return '⚡ Fastest response, minimal processing';
      case 'balanced':
        return '⚖️ Balanced speed and quality';
      case 'quality':
        return '🎭 Highest quality, most natural';
      default:
        return '';
    }
  };

  return (
    <div className="voice-selector">
      <div className="voice-selector-header">
        <span className="voice-selector-label">🎭 Therapist Voice</span>
        {voiceConfig && (
          <span className="voice-info">
            {voiceConfig.name.includes('Ava') ? 'Ava' : 'Andrew'} Neural HD
          </span>
        )}
      </div>

      <div className="voice-options">
        <button
          className={`voice-option ${currentVoice === 'female' ? 'active' : ''} ${disabled ? 'disabled' : ''}`}
          onClick={() => switchVoice('female')}
          disabled={disabled || isLoading}
          title="Switch to female therapist voice (Ava Neural HD)"
        >
          <div className="voice-icon">👩‍⚕️</div>
          <div className="voice-label">Female</div>
          <div className="voice-name">Ava</div>
        </button>

        <button
          className={`voice-option ${currentVoice === 'male' ? 'active' : ''} ${disabled ? 'disabled' : ''}`}
          onClick={() => switchVoice('male')}
          disabled={disabled || isLoading}
          title="Switch to male therapist voice (Andrew Neural HD)"
        >
          <div className="voice-icon">👨‍⚕️</div>
          <div className="voice-label">Male</div>
          <div className="voice-name">Andrew</div>
        </button>
      </div>

      {/* Performance Mode Selector */}
      <div className="performance-selector">
        <div className="performance-selector-header">
          <span className="performance-selector-label">⚡ Performance Mode</span>
          <span className="performance-info">
            {getPerformanceModeDescription(currentPerformanceMode)}
          </span>
        </div>

        <div className="performance-options">
          <button
            className={`performance-option ${currentPerformanceMode === 'fast' ? 'active' : ''} ${disabled ? 'disabled' : ''}`}
            onClick={() => switchPerformanceMode('fast')}
            disabled={disabled || isLoading}
            title="Fast mode: Minimal processing for quickest response"
          >
            <div className="performance-icon">⚡</div>
            <div className="performance-label">Fast</div>
          </button>

          <button
            className={`performance-option ${currentPerformanceMode === 'balanced' ? 'active' : ''} ${disabled ? 'disabled' : ''}`}
            onClick={() => switchPerformanceMode('balanced')}
            disabled={disabled || isLoading}
            title="Balanced mode: Good speed with natural quality"
          >
            <div className="performance-icon">⚖️</div>
            <div className="performance-label">Balanced</div>
          </button>

          <button
            className={`performance-option ${currentPerformanceMode === 'quality' ? 'active' : ''} ${disabled ? 'disabled' : ''}`}
            onClick={() => switchPerformanceMode('quality')}
            disabled={disabled || isLoading}
            title="Quality mode: Highest naturalness and expressiveness"
          >
            <div className="performance-icon">🎭</div>
            <div className="performance-label">Quality</div>
          </button>
        </div>
      </div>

      {isLoading && (
        <div className="voice-loading">
          <span>🔄 Switching...</span>
        </div>
      )}
    </div>
  );
};

export default VoiceSelector;
