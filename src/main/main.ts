import { app, BrowserWindow, ipcMain, dialog, shell } from 'electron';
import { autoUpdater } from 'electron-updater';
import * as path from 'path';
import * as fs from 'fs';

// Debug logging at startup
console.log('=== MAIN PROCESS STARTING ===');
console.log('electron-updater module loaded:', !!autoUpdater);
console.log('App version:', app.getVersion());
console.log('App name:', app.getName());

let mainWindow: BrowserWindow | null = null;

// Disable GPU acceleration to fix display issues
app.disableHardwareAcceleration();

function createWindow() {
  mainWindow = new BrowserWindow({
    width: 1200,
    height: 800,
    minWidth: 800,
    minHeight: 600,
    webPreferences: {
      nodeIntegration: false,
      contextIsolation: true,
      preload: path.join(__dirname, './preload/preload.js'),
      webSecurity: true, // Enterprise-grade security
      allowRunningInsecureContent: false,
      experimentalFeatures: false,
      plugins: false,
      devTools: process.env.NODE_ENV === 'development'
    },
    show: false, // Don't show until ready
    titleBarStyle: process.platform === 'darwin' ? 'hiddenInset' : 'default',
    autoHideMenuBar: true, // Hide the menu bar
    frame: true // Keep window frame but no menu
  });

  // Show window when ready
  mainWindow.once('ready-to-show', () => {
    if (mainWindow) {
      mainWindow.show();
    }
  });

  // Remove menu completely
  mainWindow.setMenu(null);
  
  // Load the built React app (standalone)
  mainWindow.loadFile(path.join(__dirname, 'index.html'));
  
  // Only open dev tools in development
  if (process.env.NODE_ENV === 'development') {
    mainWindow.webContents.openDevTools();
  }

  // Error handling
  mainWindow.webContents.on('did-fail-load', (event, errorCode, errorDescription) => {
    console.error('Failed to load:', errorCode, errorDescription);
  });

  // Console message handling
  mainWindow.webContents.on('console-message', (event, level, message, line, sourceId) => {
    console.log(`Console [${level}]: ${message}`);
  });

  // Crashed handling
  mainWindow.webContents.on('render-process-gone', (event, details) => {
    console.error('Renderer process crashed:', details);
  });

  mainWindow.on('closed', () => {
    mainWindow = null;
  });
}

// Global update progress window
let updateProgressWindow: BrowserWindow | null = null;

function createUpdateProgressWindow() {
  updateProgressWindow = new BrowserWindow({
    width: 450,
    height: 280,
    resizable: false,
    minimizable: false,
    maximizable: false,
    closable: false,
    alwaysOnTop: true,
    center: true,
    frame: false,
    transparent: true,
    webPreferences: {
      nodeIntegration: false,
      contextIsolation: true,
      webSecurity: true,
      allowRunningInsecureContent: false,
      experimentalFeatures: false,
      plugins: false
    }
  });

  // Create an enhanced HTML page for update progress
  const updateHTML = `
    <!DOCTYPE html>
    <html>
    <head>
      <style>
        body {
          font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;
          margin: 0;
          padding: 20px;
          background: rgba(26, 26, 26, 0.98);
          backdrop-filter: blur(10px);
          color: #fff;
          display: flex;
          flex-direction: column;
          justify-content: center;
          align-items: center;
          height: 160px;
          user-select: none;
        }
        
        .icon-container {
          margin-bottom: 15px;
        }
        
        .download-icon {
          width: 32px;
          height: 32px;
          animation: pulse 2s ease-in-out infinite;
        }
        
        @keyframes pulse {
          0%, 100% { opacity: 0.6; transform: scale(1); }
          50% { opacity: 1; transform: scale(1.1); }
        }
        
        .title { 
          font-size: 18px; 
          font-weight: 600; 
          margin-bottom: 5px; 
        }
        
        .version-info {
          font-size: 12px;
          color: #8b5cf6;
          margin-bottom: 15px;
          font-weight: 500;
        }
        
        .message { 
          font-size: 14px; 
          margin-bottom: 20px; 
          color: #ccc; 
        }
        
        .progress-container {
          width: 340px;
          height: 10px;
          background: #2a2a2a;
          border-radius: 5px;
          overflow: hidden;
          margin-bottom: 10px;
          box-shadow: inset 0 1px 3px rgba(0,0,0,0.3);
        }
        
        .progress-bar {
          height: 100%;
          background: linear-gradient(90deg, #8b5cf6, #a855f7, #8b5cf6);
          background-size: 200% 100%;
          animation: gradient 3s ease infinite;
          transition: width 0.3s ease;
          width: 0%;
          box-shadow: 0 0 10px rgba(139, 92, 246, 0.5);
        }
        
        @keyframes gradient {
          0% { background-position: 0% 50%; }
          100% { background-position: 200% 50%; }
        }
        
        .stats-container {
          display: flex;
          justify-content: space-between;
          width: 340px;
          font-size: 11px;
          color: #999;
          margin-bottom: 5px;
        }
        
        .download-info {
          display: flex;
          gap: 15px;
        }
        
        .progress-text { 
          font-size: 13px; 
          color: #fff;
          font-weight: 500;
        }
        
        .success-icon {
          display: none;
          width: 48px;
          height: 48px;
          margin: 20px 0;
          animation: checkmark 0.5s ease-out;
        }
        
        @keyframes checkmark {
          0% { transform: scale(0) rotate(-45deg); opacity: 0; }
          50% { transform: scale(1.2) rotate(-45deg); }
          100% { transform: scale(1) rotate(0); opacity: 1; }
        }
      </style>
    </head>
    <body>
      <div class="icon-container">
        <svg class="download-icon" viewBox="0 0 24 24" fill="none" stroke="#8b5cf6" stroke-width="2">
          <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"></path>
          <polyline points="7 10 12 15 17 10"></polyline>
          <line x1="12" y1="15" x2="12" y2="3"></line>
        </svg>
      </div>
      
      <div class="title">Updating Translate Your Game</div>
      <div class="version-info" id="version-info">Preparing update...</div>
      <div class="message" id="message">Downloading update...</div>
      
      <div class="progress-container">
        <div class="progress-bar" id="progress"></div>
      </div>
      
      <div class="stats-container">
        <div class="download-info">
          <span id="downloaded">0 MB</span>
          <span>/</span>
          <span id="total">0 MB</span>
          <span id="speed">0 MB/s</span>
        </div>
        <div id="time-remaining">Calculating...</div>
      </div>
      
      <div class="progress-text" id="progress-text">0%</div>
      
      <svg class="success-icon" id="success-icon" viewBox="0 0 24 24" fill="none" stroke="#4ade80" stroke-width="3">
        <circle cx="12" cy="12" r="10"></circle>
        <path d="M7 12l3 3 7-7"></path>
      </svg>
    </body>
    </html>
  `;

  updateProgressWindow.loadURL(`data:text/html;charset=utf-8,${encodeURIComponent(updateHTML)}`);
  return updateProgressWindow;
}

// Auto-updater configuration - AGGRESSIVE FORCE UPDATE
function setupAutoUpdater() {
  console.log('=== AUTO-UPDATER SETUP STARTING ===');
  console.log(`App version: ${app.getVersion()}`);
  console.log(`Platform: ${process.platform}`);
  console.log(`Arch: ${process.arch}`);
  console.log(`Electron version: ${process.versions.electron}`);
  console.log(`App path: ${app.getAppPath()}`);
  console.log(`Exe path: ${app.getPath('exe')}`);
  
  // Configure auto-updater for aggressive updates
  autoUpdater.autoDownload = true; // Enable automatic downloads
  autoUpdater.autoInstallOnAppQuit = false; // We force restart manually
  
  // Enable debug logging
  const log = require('electron-log');
  autoUpdater.logger = log;
  if (log.transports && log.transports.file) {
    log.transports.file.level = 'debug';
    console.log(`Log file: ${log.transports.file.getFile()?.path}`);
  }
  
  // Windows-specific debugging
  if (process.platform === 'win32') {
    console.log('=== WINDOWS PLATFORM DETECTED ===');
    console.log(`Windows version: ${process.getSystemVersion()}`);
    console.log(`Is packaged: ${app.isPackaged}`);
    console.log(`Resources path: ${process.resourcesPath}`);
    console.log(`Temp directory: ${app.getPath('temp')}`);
    
    // Force specific provider config for Windows
    autoUpdater.setFeedURL({
      provider: 'github',
      owner: 'NeilVibe',
      repo: 'TranslateYourGameApp',
      private: false,
      protocol: 'https'
    });
  }
  
  // Auto-updater event handlers
  autoUpdater.on('checking-for-update', () => {
    console.log('=== CHECKING FOR UPDATE ===');
    console.log(`Time: ${new Date().toISOString()}`);
    console.log('GitHub API call initiated...');
  });
  
  autoUpdater.on('update-available', (info) => {
    console.log('=== UPDATE AVAILABLE ===');
    console.log('Full update info:', JSON.stringify(info, null, 2));
    console.log(`Version: ${info.version}`);
    console.log(`Release date: ${info.releaseDate}`);
    console.log(`Release notes: ${info.releaseNotes}`);
    
    if (mainWindow) {
      // Store update info for progress window
      const currentVersion = app.getVersion();
      const newVersion = info.version;
      
      // FULLY AUTOMATIC UPDATE: No confirmation needed
      console.log('Starting automatic update download...');
      
      // Create progress window immediately
      createUpdateProgressWindow();
      
      // Set version info in progress window
      if (updateProgressWindow) {
        updateProgressWindow.webContents.executeJavaScript(`
          document.getElementById('version-info').textContent = 'v${currentVersion} → v${newVersion}';
        `);
      }
      
      // Disable main window interaction
      if (mainWindow) {
        mainWindow.setEnabled(false);
      }
      // Start download automatically without user confirmation
      autoUpdater.downloadUpdate();
    }
  });
  
  autoUpdater.on('update-not-available', () => {
    console.log('=== NO UPDATE AVAILABLE ===');
    console.log(`Current version ${app.getVersion()} is the latest`);
    console.log(`Checked at: ${new Date().toISOString()}`);
  });
  
  autoUpdater.on('error', (err) => {
    console.error('=== AUTO-UPDATER ERROR ===');
    console.error('Error type:', err.name);
    console.error('Error message:', err.message);
    console.error('Error stack:', err.stack);
    console.error('Full error object:', JSON.stringify(err, null, 2));
    
    // Windows-specific error analysis
    if (process.platform === 'win32') {
      console.error('=== WINDOWS ERROR ANALYSIS ===');
      
      // Common Windows errors
      if (err.message.includes('net::ERR_')) {
        console.error('Network error detected. Check firewall/proxy settings.');
      }
      if (err.message.includes('ENOENT')) {
        console.error('File not found. Check if update assets exist.');
      }
      if (err.message.includes('EPERM') || err.message.includes('EACCES')) {
        console.error('Permission error. App may need to run as administrator.');
      }
      if (err.message.includes('Cannot find module')) {
        console.error('Module loading error. Check electron-updater installation.');
      }
      if (err.message.includes('GitHub')) {
        console.error('GitHub API error. Check release assets and manifests.');
      }
    }
    // Close progress window if it exists
    if (updateProgressWindow) {
      updateProgressWindow.close();
      updateProgressWindow = null;
    }
    // Re-enable main window
    if (mainWindow) {
      mainWindow.setEnabled(true);
    }
    // Only show error if it's not a "no updates" error
    if (!err.message.includes('No published versions') && !err.message.includes('Cannot find latest')) {
      if (mainWindow) {
        dialog.showErrorBox('Update Error', 'Failed to check for updates. Please try again later.');
      }
    }
  });
  
  autoUpdater.on('download-progress', (progressObj) => {
    const percent = Math.round(progressObj.percent);
    console.log('=== DOWNLOAD PROGRESS ===');
    console.log(`Progress: ${percent}%`);
    console.log(`Downloaded: ${progressObj.transferred} / ${progressObj.total} bytes`);
    console.log(`Speed: ${progressObj.bytesPerSecond} bytes/sec`);
    
    // Calculate stats
    const downloadedMB = (progressObj.transferred / 1024 / 1024).toFixed(1);
    const totalMB = (progressObj.total / 1024 / 1024).toFixed(1);
    const speedMB = (progressObj.bytesPerSecond / 1024 / 1024).toFixed(2);
    
    // Calculate time remaining
    const bytesRemaining = progressObj.total - progressObj.transferred;
    const secondsRemaining = Math.round(bytesRemaining / progressObj.bytesPerSecond);
    let timeRemaining = 'Calculating...';
    
    if (secondsRemaining < 60) {
      timeRemaining = `${secondsRemaining}s remaining`;
    } else if (secondsRemaining < 3600) {
      const minutes = Math.floor(secondsRemaining / 60);
      const seconds = secondsRemaining % 60;
      timeRemaining = `${minutes}m ${seconds}s remaining`;
    } else {
      timeRemaining = 'A while remaining';
    }
    
    // Update progress window
    if (updateProgressWindow) {
      updateProgressWindow.webContents.executeJavaScript(`
        document.getElementById('progress').style.width = '${percent}%';
        document.getElementById('progress-text').textContent = '${percent}%';
        document.getElementById('downloaded').textContent = '${downloadedMB} MB';
        document.getElementById('total').textContent = '${totalMB} MB';
        document.getElementById('speed').textContent = '${speedMB} MB/s';
        document.getElementById('time-remaining').textContent = '${timeRemaining}';
      `);
    }
  });
  
  autoUpdater.on('update-downloaded', (info) => {
    console.log('=== UPDATE DOWNLOADED ===');
    console.log('Downloaded version:', info.version);
    console.log('Download complete at:', new Date().toISOString());
    
    // Show success animation in progress window
    if (updateProgressWindow) {
      updateProgressWindow.webContents.executeJavaScript(`
        document.getElementById('progress').style.width = '100%';
        document.getElementById('progress-text').textContent = '100%';
        document.getElementById('message').textContent = 'Download complete!';
        document.querySelector('.download-icon').style.display = 'none';
        document.getElementById('success-icon').style.display = 'block';
        document.getElementById('time-remaining').textContent = 'Restarting now...';
      `);
      
      // Wait for animation then restart automatically
      setTimeout(() => {
        if (updateProgressWindow) {
          updateProgressWindow.close();
          updateProgressWindow = null;
        }
        
        // AUTOMATIC RESTART: No user confirmation needed
        console.log('Automatically restarting to apply update...');
        autoUpdater.quitAndInstall(false, true);
      }, 1500); // Show success for 1.5 seconds
    }
  });
  
  // Check for updates immediately and every 30 minutes
  console.log('=== INITIATING UPDATE CHECK ===');
  console.log('Calling autoUpdater.checkForUpdatesAndNotify()...');
  
  // Add manual check command for debugging
  ipcMain.on('check-for-updates', () => {
    console.log('Manual update check requested');
    autoUpdater.checkForUpdatesAndNotify();
  });
  
  autoUpdater.checkForUpdatesAndNotify()
    .then((result) => {
      console.log('=== UPDATE CHECK RESULT ===');
      console.log('Result:', result);
      
      // Windows-specific result logging
      if (process.platform === 'win32' && result) {
        console.log('Windows update check successful');
        console.log('Update available:', result.isUpdateAvailable);
        if (result.versionInfo) {
          console.log('Latest version:', result.versionInfo.version);
        }
      }
    })
    .catch((error) => {
      console.error('=== UPDATE CHECK FAILED ===');
      console.error('Error:', error);
      
      // Windows-specific error guidance
      if (process.platform === 'win32') {
        console.error('\n=== WINDOWS TROUBLESHOOTING ===');
        console.error('1. Check Windows Defender/Firewall - may block GitHub');
        console.error('2. Try running as Administrator');
        console.error('3. Check proxy settings if behind corporate network');
        console.error('4. Verify internet connection to github.com');
        console.error('5. Log file location:', app.getPath('userData') + '\\logs\\main.log');
      }
    });
  
  setInterval(() => {
    console.log('=== PERIODIC UPDATE CHECK ===');
    autoUpdater.checkForUpdatesAndNotify();
  }, 30 * 60 * 1000); // Check every 30 minutes
}

// App event listeners
app.whenReady().then(() => {
  try {
    createWindow();
    
    // Setup auto-updater after window is created - ALWAYS check for updates
    setupAutoUpdater();
  } catch (error) {
    console.error('Failed to create window:', error);
    app.quit();
  }
});

app.on('window-all-closed', () => {
  if (process.platform !== 'darwin') {
    app.quit();
  }
});

app.on('activate', () => {
  if (BrowserWindow.getAllWindows().length === 0) {
    createWindow();
  }
});

// IPC handlers for file operations
ipcMain.handle('dialog:openFile', async () => {
  const result = await dialog.showOpenDialog(mainWindow!, {
    properties: ['openFile'],
    filters: [
      { name: 'Supported Files', extensions: ['xlsx', 'xls', 'csv', 'json', 'xml', 'po', 'pot'] },
      { name: 'Excel Files', extensions: ['xlsx', 'xls'] },
      { name: 'CSV Files', extensions: ['csv'] },
      { name: 'JSON Files', extensions: ['json'] },
      { name: 'XML Files', extensions: ['xml'] },
      { name: 'Gettext Files', extensions: ['po', 'pot'] },
      { name: 'All Files', extensions: ['*'] }
    ]
  });

  if (!result.canceled && result.filePaths.length > 0) {
    const filePath = result.filePaths[0];
    const fileContent = fs.readFileSync(filePath);
    const fileInfo = {
      path: filePath,
      name: path.basename(filePath),
      extension: path.extname(filePath).toLowerCase(),
      size: fileContent.length,
      content: fileContent
    };
    return fileInfo;
  }
  return null;
});

ipcMain.handle('dialog:saveFile', async (event, { fileName, content }) => {
  const result = await dialog.showSaveDialog(mainWindow!, {
    defaultPath: fileName,
    filters: [
      { name: 'Same as source', extensions: ['*'] }
    ]
  });

  if (!result.canceled && result.filePath) {
    fs.writeFileSync(result.filePath, content);
    return result.filePath;
  }
  return null;
});

// Screenshot functionality for visual AI development
ipcMain.handle('app:screenshot', async () => {
  if (mainWindow) {
    const image = await mainWindow.capturePage();
    const screenshotPath = path.join(app.getPath('temp'), `screenshot_${Date.now()}.png`);
    fs.writeFileSync(screenshotPath, image.toPNG());
    return screenshotPath;
  }
  return null;
});

// API key storage (secure storage in production)
// Import secure config
import secureConfig from './secureConfig';

ipcMain.handle('storage:getApiKey', async () => {
  return secureConfig.getApiKey();
});

ipcMain.handle('storage:setApiKey', async (event, apiKey) => {
  return secureConfig.setApiKey(apiKey);
});

// Open external links
ipcMain.handle('shell:openExternal', async (event, url) => {
  shell.openExternal(url);
});

// Auto-updater restart
ipcMain.handle('app:restart', async () => {
  autoUpdater.quitAndInstall();
});

// Test auto-update functionality
ipcMain.handle('app:checkForUpdates', async () => {
  console.log('Manual update check requested');
  try {
    const result = await autoUpdater.checkForUpdates();
    return {
      updateAvailable: result?.updateInfo ? true : false,
      currentVersion: app.getVersion(),
      updateInfo: result?.updateInfo || null
    };
  } catch (error) {
    console.error('Update check failed:', error);
    return {
      updateAvailable: false,
      currentVersion: app.getVersion(),
      error: (error as Error).message
    };
  }
});