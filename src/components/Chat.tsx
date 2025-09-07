import React, { useEffect, useState } from 'react';

// Define message type
interface Message {
  id: string;
  text: string;
  sender: 'user' | 'therapist';
  timestamp: number;
}

interface ChatProps {
  messages: Message[];
  isTyping?: boolean;
}

const Chat: React.FC<ChatProps> = ({ messages, isTyping = false }) => {
  const [visibleMessages, setVisibleMessages] = useState<Message[]>([]);
  const [animatingMessage, setAnimatingMessage] = useState<string | null>(null);

  useEffect(() => {
    if (messages.length > 0) {
      const latestMessage = messages[messages.length - 1];
      setAnimatingMessage(latestMessage.id);

      // Add message with animation delay
      setTimeout(() => {
        setVisibleMessages([latestMessage]);
        setAnimatingMessage(null);
      }, 100);

      // Fade out message after 8 seconds for voice-focused experience
      const timer = setTimeout(() => {
        setVisibleMessages([]);
      }, 8000);

      return () => clearTimeout(timer);
    }
  }, [messages]);

  const TypingIndicator = () => (
    <div className="typing-indicator">
      <div className="typing-dots">
        <span></span>
        <span></span>
        <span></span>
      </div>
      <span className="typing-text">Therapist is typing...</span>
    </div>
  );

  if (visibleMessages.length === 0 && !isTyping) {
    return (
      <div className="chat-minimal-container">
        <div className="conversation-hint">
          <span className="hint-text">Voice conversation in progress...</span>
          <div className="hint-icon">🎯</div>
        </div>
      </div>
    );
  }

  return (
    <div className="chat-minimal-container">
      {visibleMessages.map((message) => (
        <div
          key={message.id}
          className={`message-minimal ${message.sender} ${
            animatingMessage === message.id ? 'message-entering' : ''
          }`}
        >
          <div className="message-content-minimal">
            <div className="sender-minimal">
              {message.sender === 'user' ? 'You' : 'Therapist'}
              <div className="message-timestamp">
                {new Date(message.timestamp).toLocaleTimeString([], {
                  hour: '2-digit',
                  minute: '2-digit'
                })}
              </div>
            </div>
            <div className="message-text-minimal">{message.text}</div>
            <div className="message-tail"></div>
          </div>
        </div>
      ))}

      {isTyping && <TypingIndicator />}
    </div>
  );
};

export default Chat;
