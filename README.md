# Translate Your Game - Desktop App

Professional game localization desktop application powered by AI translation with dynamic glossary systems.

## 📥 Download

**[Download Latest Release](../../releases/latest)**

### Supported Platforms

- **Windows** - `.exe` installer (64-bit) 
- **macOS** - `.zip` archive (Intel & Apple Silicon)

## ✨ Features

- 🎯 **Smart Translation** - AI-powered translation with dynamic glossary generation
- 🚀 **Simple Translation** - Fast batch processing for quick translations
- 📚 **Glossary Management** - Complete CRUD operations for translation glossaries
- 📊 **Real-time Progress** - Professional progress tracking with detailed metrics
- 💻 **Professional UI** - Modern interface with 3-tab workflow
- 🔄 **File Support** - CSV, XLSX, JSON formats with more coming soon

## 🚀 Quick Start

### Windows Installation
1. **Download** `Translate Your Game Setup.exe` from [Releases](../../releases/latest)
2. **Run** the installer and follow the setup wizard
3. **Launch** the app from Start Menu or Desktop shortcut

### Mac Installation  
1. **Download** `Translate Your Game-mac.zip` from [Releases](../../releases/latest)
2. **Extract** the ZIP file 
3. **Drag** `Translate Your Game.app` to your Applications folder
4. **Launch** from Applications (first time: right-click → Open to bypass Gatekeeper)

### Getting Started
1. **Launch** the desktop app
2. **Enter** your API server URL (e.g., `http://localhost:5002` for local development)
3. **Upload** your game files and start translating!

## 🛠 Development

### Prerequisites

- Node.js 18+
- npm

### Setup

```bash
# Clone the repository
git clone <your-repo-url>
cd translate-your-game-desktop

# Install dependencies
npm install

# Start development
npm run dev:web    # Web development server (localhost:3000)
npm run dev        # Electron development
```

### Building

```bash
# Build for all platforms (requires platform-specific tools)
npm run build:all

# Build for specific platforms
npm run build:win     # Windows
npm run build:mac     # macOS  
npm run build:linux   # Linux
```

## 🏗 Architecture

- **Frontend**: React 18 + TypeScript + Ant Design
- **Desktop**: Electron with professional build system
- **Build**: Webpack + Electron Builder
- **CI/CD**: GitHub Actions for automated builds

## 📋 System Requirements

### Windows
- Windows 10 or later (64-bit)
- 4GB RAM minimum, 8GB recommended

### macOS
- macOS 10.15 (Catalina) or later
- Intel or Apple Silicon processors

### Linux
- Ubuntu 18.04+ / Fedora 32+ / equivalent
- glibc 2.28+ (most modern distributions)

## 🔐 Security

The desktop app connects to your Translate Your Game server using:
- API key authentication
- HTTPS connections (in production)
- No sensitive data stored locally

## 📞 Support

- **Issues**: [GitHub Issues](../../issues)
- **Documentation**: [Translate Your Game Docs](https://translateyourgame.com/docs)
- **Website**: [translateyourgame.com](https://translateyourgame.com)

## 📄 License

Copyright (c) 2025 Translate Your Game. All rights reserved. See [LICENSE](LICENSE) file for details.

---

**Made with ❤️ for the game development community**