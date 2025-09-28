# Preach Point PWA

A Progressive Web Application for AI-powered sermon summarization and biblical study.

## Features

- 🎤 **Real-time Sermon Recording** - Browser-native audio recording
- 🤖 **AI-Powered Analysis** - Automatic transcription and summarization
- 📚 **Discovery Bible Study** - Structured study methodology (Observe, Interpret, Apply, Pray)
- 💡 **Key Takeaways** - Extracted main points and insights
- 💬 **Discussion Questions** - Generated for small group engagement
- 📝 **Personal Notes** - Add your own thoughts and reflections
- 🙏 **Prayer & Action Steps** - Practical application guidance

## Premium UI Features

- Beautiful gradient backgrounds with glass-morphism effects
- Smooth animations and transitions
- Responsive design for mobile and desktop
- Professional tab-based navigation
- Premium typography and styling

## Quick Start

1. **Install Dependencies**
   ```bash
   npm install
   ```

2. **Start Development Server**
   ```bash
   npm start
   ```

3. **Build for Production**
   ```bash
   npm run build
   ```

## Deployment

### Option 1: Netlify (Recommended)
1. Connect your GitHub repository to Netlify
2. Netlify will automatically detect the build settings from `netlify.toml`
3. Your app will be deployed at: `https://your-app-name.netlify.app`

### Option 2: Vercel
1. Connect your GitHub repository to Vercel
2. Vercel will automatically detect it's a React app
3. Your app will be deployed at: `https://your-app-name.vercel.app`

### Option 3: Manual Upload
1. Run `npm run build` to create the production build
2. Upload the `build/` folder to any static hosting service

## PWA Features

- **Installable**: Can be installed as a native app on mobile and desktop
- **Offline Ready**: Core features work without internet (except AI processing)
- **Responsive**: Optimized for all screen sizes
- **Fast Loading**: Optimized bundle size and performance

## Architecture

- **Frontend**: React 18 with TypeScript
- **Styling**: Custom CSS with modern features (gradients, backdrop-filter, animations)
- **Audio**: Web Audio API with MediaRecorder
- **Storage**: localStorage for sermon history
- **Backend**: Vercel serverless functions with OpenAI integration

## Browser Compatibility

- Chrome 88+ (Recommended)
- Firefox 89+
- Safari 14.1+
- Edge 88+

## Development

The app uses modern web APIs:
- MediaRecorder API for audio recording
- localStorage for data persistence
- Fetch API for backend communication
- CSS Grid and Flexbox for layouts

## License

This project is for demonstration purposes and includes AI-powered features.