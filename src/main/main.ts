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
  mainWindow.loadFile(path.join(__dirname, './index.html'));
  
  // Only open dev tools in development
  if (process.env.NODE_ENV === 'development') {
    mainWindow.webContents.openDevTools();
  }

  // Error handling
  mainWindow.webContents.on('did-fail-load', (event, errorCode, errorDescription) => {
    console.error('Failed to load:', errorCode, errorDescription);
  });

  mainWindow.on('closed', () => {
    mainWindow = null;
  });
}

// Auto-updater configuration
function setupAutoUpdater() {
  // Configure auto-updater
  autoUpdater.autoDownload = true;
  autoUpdater.autoInstallOnAppQuit = true;
  
  // Auto-updater event handlers
  autoUpdater.on('checking-for-update', () => {
    console.log('Checking for updates...');
  });
  
  autoUpdater.on('update-available', (info) => {
    console.log('Update available:', info.version);
    // Send to renderer process
    if (mainWindow) {
      mainWindow.webContents.send('update-available', info);
    }
  });
  
  autoUpdater.on('update-not-available', () => {
    console.log('No updates available');
  });
  
  autoUpdater.on('error', (err) => {
    console.error('Auto-updater error:', err);
    // Send to renderer process
    if (mainWindow) {
      mainWindow.webContents.send('update-error', err);
    }
  });
  
  autoUpdater.on('download-progress', (progressObj) => {
    let log_message = "Download speed: " + progressObj.bytesPerSecond;
    log_message = log_message + ' - Downloaded ' + progressObj.percent + '%';
    log_message = log_message + ' (' + progressObj.transferred + "/" + progressObj.total + ')';
    console.log(log_message);
    
    // Send to renderer process
    if (mainWindow) {
      mainWindow.webContents.send('download-progress', progressObj);
    }
  });
  
  autoUpdater.on('update-downloaded', (info) => {
    console.log('Update downloaded:', info.version);
    // Send to renderer process
    if (mainWindow) {
      mainWindow.webContents.send('update-downloaded', info);
    }
  });
  
  // Check for updates
  autoUpdater.checkForUpdatesAndNotify();
}

// App event listeners
app.whenReady().then(() => {
  try {
    createWindow();
    
    // Setup auto-updater after window is created
    if (process.env.NODE_ENV !== 'development') {
      setupAutoUpdater();
    }
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
const secureConfig = require('./secureConfig');

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