# Zeyphr Frontend - AI Voice Therapist Interface

The React-based frontend for Zeyphr, providing an intuitive voice interface for AI-powered therapy sessions.

## ✨ Features

- **🎤 Real-time Voice Interaction** - Seamless speech-to-text and text-to-speech
- **🎵 Audio Visualization** - Beautiful waveform animations during conversations
- **💬 Chat Interface** - Clean message display with therapist responses
- **🎛️ Voice Controls** - Switch between male/female therapist voices
- **⚡ Performance Modes** - Fast, balanced, and quality TTS options
- **🔄 Smart Interruption** - Natural conversation flow with pause/resume
- **📱 Responsive Design** - Works on desktop and mobile devices

## 🚀 Quick Start

### Prerequisites
- Node.js (v18 or later)
- Backend API running (see [Backend Repository](https://github.com/yourusername/zeyphr-backend))

### Installation

1. **Clone the repository**
   ```bash
   git clone https://github.com/yourusername/zeyphr-frontend.git
   cd zeyphr-frontend
   ```

2. **Install dependencies**
   ```bash
   npm install
   ```

3. **Configure environment**
   ```bash
   cp .env.example .env
   # Edit .env with your backend URL
   ```

4. **Start development server**
   ```bash
   npm start
   ```

5. **Open** `http://localhost:3000`

## 🏗️ Project Structure

```
frontend/
├── public/
│   ├── index.html
│   └── favicon.ico
├── src/
│   ├── components/
│   │   ├── Chat.tsx           # Message display component
│   │   ├── VoiceVisualizer.tsx # Audio waveform visualization
│   │   └── VoiceSelector.tsx   # Voice and performance settings
│   ├── App.tsx                # Main application component
│   ├── socket-enhanced.ts     # Socket.IO client integration
│   ├── modern-styles.css      # Modern UI styles
│   └── index.tsx              # Application entry point
├── package.json
└── README.md
```

## 🔧 Configuration

### Environment Variables (.env)

```env
# Backend API URL
REACT_APP_BACKEND_URL=https://zeyphr-app-gm5d6.ondigitalocean.app

# For production
REACT_APP_BACKEND_URL=https://your-backend-domain.com
```

## 🎨 Key Components

### VoiceVisualizer
- Real-time audio frequency analysis
- Beautiful animated waveforms
- Activity indicators for speaking/listening states

### Chat Component
- Message history display
- Auto-scrolling conversation view
- Timestamp formatting
- User/Therapist message differentiation

### VoiceSelector
- Male/Female voice switching
- Performance mode selection (Fast/Balanced/Quality)
- Real-time voice configuration updates

## 🌐 Browser Support

- ✅ **Chrome/Edge** - Full support with WebRTC
- ⚠️ **Firefox** - Limited speech recognition support
- ❌ **Safari** - Not supported (WebRTC limitations)

## 🔧 Development

### Available Scripts

```bash
npm start          # Start development server
npm run build      # Build for production
npm test           # Run tests
npm run eject      # Eject from Create React App
```

### Building for Production

```bash
npm run build
```

This creates an optimized production build in the `build` folder, ready for deployment to static hosting services like Vercel, Netlify, or Cloudflare Pages.

## 🔌 Socket.IO Integration

The frontend connects to the backend via Socket.IO for real-time communication:

- **Connection Management** - Automatic reconnection and error handling
- **Voice Streaming** - Real-time audio data transmission
- **Session Control** - Start, pause, resume, and end therapy sessions
- **Status Updates** - Live status indicators for conversation state

## 🎨 Styling

- **CSS Variables** - Consistent theming with dark mode support
- **Glass Morphism** - Modern translucent UI elements
- **Smooth Animations** - CSS transitions and keyframe animations
- **Responsive Grid** - Mobile-first responsive design

## 🐛 Troubleshooting

### Connection Issues
- ✅ Verify `REACT_APP_BACKEND_URL` in `.env`
- ✅ Check if backend server is running
- ✅ Check browser console for CORS errors

### Audio Issues
- ✅ Grant microphone permissions when prompted
- ✅ Check browser compatibility
- ✅ Verify WebRTC support

### Build Issues
- ✅ Clear node_modules and reinstall: `rm -rf node_modules && npm install`
- ✅ Check Node.js version compatibility
- ✅ Verify all dependencies are installed

## 🤝 Contributing

1. Fork the repository
2. Create a feature branch (`git checkout -b feature/amazing-feature`)
3. Commit your changes (`git commit -m 'Add amazing feature'`)
4. Push to the branch (`git push origin feature/amazing-feature`)
5. Open a Pull Request

## 📄 License

This project is part of the Zeyphr AI Therapist application. See the main repository for license information.

---

**Built with ❤️ for accessible mental health support**
