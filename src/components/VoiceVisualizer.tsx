import React, { useRef, useEffect } from 'react';

interface VoiceVisualizerProps {
  userAudioContext: AudioContext | null;
  userAudioSource: MediaStreamAudioSourceNode | null;
  userAudioAnalyser: AnalyserNode | null;
  aiAudioAnalyser: AnalyserNode | null;
  isListening: boolean;
  isSpeaking: boolean;
}

const VoiceVisualizer: React.FC<VoiceVisualizerProps> = ({ 
  userAudioContext, 
  userAudioSource, 
  userAudioAnalyser,
  aiAudioAnalyser,
  isListening,
  isSpeaking
}) => {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const animationRef = useRef<number | undefined>(undefined);
  const userAnalyserRef = useRef<AnalyserNode | null>(null);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;

    const canvasCtx = canvas.getContext('2d');
    if (!canvasCtx) return;

    // Set up canvas size
    const resizeCanvas = () => {
      const rect = canvas.getBoundingClientRect();
      canvas.width = rect.width * window.devicePixelRatio;
      canvas.height = rect.height * window.devicePixelRatio;
      canvasCtx.scale(window.devicePixelRatio, window.devicePixelRatio);
    };

    resizeCanvas();
    window.addEventListener('resize', resizeCanvas);

    // Create user audio analyser if we have audio context and source
    if (userAudioContext && userAudioSource && !userAnalyserRef.current) {
      // Use the analyser passed from parent if available, otherwise create our own
      if (userAudioAnalyser) {
        userAnalyserRef.current = userAudioAnalyser;
      } else {
        userAnalyserRef.current = userAudioContext.createAnalyser();
        userAnalyserRef.current.fftSize = 256;
        userAnalyserRef.current.smoothingTimeConstant = 0.8;
        userAudioSource.connect(userAnalyserRef.current);
      }
    }

    const draw = () => {
      animationRef.current = requestAnimationFrame(draw);

      const width = canvas.width / window.devicePixelRatio;
      const height = canvas.height / window.devicePixelRatio;

      // Clear canvas with dark background
      canvasCtx.fillStyle = 'rgba(10, 10, 15, 0.9)';
      canvasCtx.fillRect(0, 0, width, height);

      let dataArray: Uint8Array<ArrayBuffer> | null = null;
      let color = 'rgba(102, 126, 234, 0.8)'; // Default blue

      // Determine which audio source to visualize
      if (isListening && userAnalyserRef.current) {
        // User is speaking - prioritize user audio (blue)
        const bufferLength = userAnalyserRef.current.frequencyBinCount;
        dataArray = new Uint8Array(bufferLength);
        userAnalyserRef.current.getByteFrequencyData(dataArray as any);
        color = 'rgba(102, 126, 234, 0.8)'; // Blue for user
      } else if (isSpeaking && aiAudioAnalyser) {
        // AI is speaking and user is not - use red visualization
        const bufferLength = aiAudioAnalyser.frequencyBinCount;
        dataArray = new Uint8Array(bufferLength);
        aiAudioAnalyser.getByteFrequencyData(dataArray as any);
        color = 'rgba(239, 68, 68, 0.8)'; // Red for AI
      }

      if (dataArray) {
        // Draw frequency bars
        const barCount = 64;
        const barWidth = width / barCount;
        const centerY = height / 2;

        for (let i = 0; i < barCount; i++) {
          const dataIndex = Math.floor((i / barCount) * dataArray.length);
          const barHeight = (dataArray[dataIndex] / 255) * (height * 0.4);
          
          const x = i * barWidth;
          
          // Create gradient for the bar
          const gradient = canvasCtx.createLinearGradient(0, centerY - barHeight/2, 0, centerY + barHeight/2);
          gradient.addColorStop(0, color);
          gradient.addColorStop(1, color.replace('0.8', '0.3'));
          
          // Add glow effect
          canvasCtx.shadowColor = color;
          canvasCtx.shadowBlur = 10;
          
          // Draw the bar (symmetric)
          canvasCtx.fillStyle = gradient;
          canvasCtx.fillRect(x + 1, centerY - barHeight/2, barWidth - 2, barHeight);
          
          // Reset shadow
          canvasCtx.shadowBlur = 0;
        }
      } else {
        // Draw idle animation when no audio
        drawIdleAnimation(canvasCtx, width, height);
      }
    };

    const drawIdleAnimation = (ctx: CanvasRenderingContext2D, width: number, height: number) => {
      const centerY = height / 2;
      const time = Date.now() * 0.001;
      
      ctx.strokeStyle = 'rgba(102, 126, 234, 0.3)';
      ctx.lineWidth = 2;
      ctx.beginPath();
      
      for (let x = 0; x < width; x += 4) {
        const y = centerY + Math.sin(x * 0.02 + time * 2) * 8;
        if (x === 0) {
          ctx.moveTo(x, y);
        } else {
          ctx.lineTo(x, y);
        }
      }
      
      ctx.stroke();
    };

    draw();

    return () => {
      if (animationRef.current !== undefined) {
        cancelAnimationFrame(animationRef.current);
      }
      window.removeEventListener('resize', resizeCanvas);
    };
  }, [userAudioContext, userAudioSource, userAudioAnalyser, aiAudioAnalyser, isListening, isSpeaking]);

  return (
    <div className="voice-visualizer">
      <canvas 
        ref={canvasRef} 
        style={{ 
          width: '100%', 
          height: '120px',
          borderRadius: '16px',
          background: 'rgba(10, 10, 15, 0.8)'
        }} 
      />
      <div className="visualizer-status">
        {isSpeaking && (
          <div className="status-indicator ai-speaking">
            <div className="indicator-dot"></div>
            <span>AI Speaking</span>
          </div>
        )}
        {isListening && !isSpeaking && (
          <div className="status-indicator user-listening">
            <div className="indicator-dot"></div>
            <span>Listening</span>
          </div>
        )}
        {!isListening && !isSpeaking && (
          <div className="status-indicator idle">
            <div className="indicator-dot"></div>
            <span>Ready</span>
          </div>
        )}
      </div>
    </div>
  );
};

export default VoiceVisualizer;
