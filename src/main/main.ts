import { app, BrowserWindow, ipcMain, dialog, shell } from 'electron';
import { autoUpdater } from 'electron-updater';
import * as path from 'path';
import * as fs from 'fs';

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
    width: 400,
    height: 200,
    resizable: false,
    minimizable: false,
    maximizable: false,
    closable: false,
    alwaysOnTop: true,
    center: true,
    frame: false,
    webPreferences: {
      nodeIntegration: true,
      contextIsolation: false
    }
  });

  // Create a simple HTML page for update progress
  const updateHTML = `
    <!DOCTYPE html>
    <html>
    <head>
      <style>
        body {
          font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;
          margin: 0;
          padding: 20px;
          background: #1a1a1a;
          color: #fff;
          display: flex;
          flex-direction: column;
          justify-content: center;
          align-items: center;
          height: 160px;
        }
        .title { font-size: 18px; font-weight: 600; margin-bottom: 10px; }
        .message { font-size: 14px; margin-bottom: 20px; color: #ccc; }
        .progress-container {
          width: 300px;
          height: 8px;
          background: #333;
          border-radius: 4px;
          overflow: hidden;
          margin-bottom: 10px;
        }
        .progress-bar {
          height: 100%;
          background: linear-gradient(90deg, #8b5cf6, #a855f7);
          transition: width 0.3s ease;
          width: 0%;
        }
        .progress-text { font-size: 12px; color: #888; }
      </style>
    </head>
    <body>
      <div class="title">Updating Translate Your Game</div>
      <div class="message">Downloading update...</div>
      <div class="progress-container">
        <div class="progress-bar" id="progress"></div>
      </div>
      <div class="progress-text" id="progress-text">0%</div>
    </body>
    </html>
  `;

  updateProgressWindow.loadURL(`data:text/html;charset=utf-8,${encodeURIComponent(updateHTML)}`);
  return updateProgressWindow;
}

// Auto-updater configuration - AGGRESSIVE FORCE UPDATE
function setupAutoUpdater() {
  // Configure auto-updater for aggressive updates
  autoUpdater.autoDownload = true; // Enable automatic downloads
  autoUpdater.autoInstallOnAppQuit = false; // We force restart manually
  
  // Auto-updater event handlers
  autoUpdater.on('checking-for-update', () => {
    console.log('Checking for updates...');
  });
  
  autoUpdater.on('update-available', (info) => {
    console.log('Update available:', info.version);
    
    if (mainWindow) {
      // AGGRESSIVE UPDATE: Show modal dialog that forces update
      dialog.showMessageBox(mainWindow, {
        type: 'info',
        title: 'Update Required',
        message: `Version ${info.version} is available`,
        detail: 'This update will be downloaded and installed automatically. The application will restart when complete.',
        buttons: ['Download Now'],
        defaultId: 0,
        noLink: true
      }).then(() => {
        // Create progress window immediately
        createUpdateProgressWindow();
        // Disable main window interaction
        if (mainWindow) {
          mainWindow.setEnabled(false);
        }
        // Start download automatically
        autoUpdater.downloadUpdate();
      });
    }
  });
  
  autoUpdater.on('update-not-available', () => {
    console.log('No updates available');
    // Only log, don't show any popup for no updates
  });
  
  autoUpdater.on('error', (err) => {
    console.error('Auto-updater error:', err);
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
    console.log(`Download progress: ${percent}%`);
    
    // Update progress window
    if (updateProgressWindow) {
      updateProgressWindow.webContents.executeJavaScript(`
        document.getElementById('progress').style.width = '${percent}%';
        document.getElementById('progress-text').textContent = '${percent}%';
      `);
    }
  });
  
  autoUpdater.on('update-downloaded', (info) => {
    console.log('Update downloaded:', info.version);
    
    // Close progress window
    if (updateProgressWindow) {
      updateProgressWindow.close();
      updateProgressWindow = null;
    }
    
    // FORCE RESTART: No choice given to user
    if (mainWindow) {
      dialog.showMessageBox(mainWindow, {
        type: 'info',
        title: 'Update Complete',
        message: `Version ${info.version} has been downloaded`,
        detail: 'The application will restart now to apply the update.',
        buttons: ['Restart Now'],
        defaultId: 0,
        noLink: true
      }).then(() => {
        // Force quit and install immediately
        autoUpdater.quitAndInstall(false, true);
      });
    }
  });
  
  // Check for updates immediately and every 30 minutes
  autoUpdater.checkForUpdatesAndNotify();
  setInterval(() => {
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