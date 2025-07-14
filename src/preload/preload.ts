import { contextBridge, ipcRenderer } from 'electron';

// Expose protected methods that allow the renderer process to use
// the ipcRenderer without exposing the entire object
contextBridge.exposeInMainWorld('electronAPI', {
  // File operations
  openFile: () => ipcRenderer.invoke('dialog:openFile'),
  saveFile: (data: { fileName: string; content: Buffer }) => 
    ipcRenderer.invoke('dialog:saveFile', data),
  
  // Screenshot for visual AI
  takeScreenshot: () => ipcRenderer.invoke('app:screenshot'),
  
  // API key storage
  getApiKey: () => ipcRenderer.invoke('storage:getApiKey'),
  setApiKey: (apiKey: string) => ipcRenderer.invoke('storage:setApiKey', apiKey),
  
  // External links
  openExternal: (url: string) => ipcRenderer.invoke('shell:openExternal', url),
  
  // Auto-updater events
  onUpdateAvailable: (callback: (info: any) => void) => 
    ipcRenderer.on('update-available', (event, info) => callback(info)),
  onDownloadProgress: (callback: (progress: any) => void) => 
    ipcRenderer.on('download-progress', (event, progress) => callback(progress)),
  onUpdateDownloaded: (callback: (info: any) => void) => 
    ipcRenderer.on('update-downloaded', (event, info) => callback(info)),
  onUpdateError: (callback: (error: any) => void) => 
    ipcRenderer.on('update-error', (event, error) => callback(error)),
  restartApp: () => ipcRenderer.invoke('app:restart'),
  removeAllListeners: (channel: string) => ipcRenderer.removeAllListeners(channel),
  
  // Platform info
  platform: process.platform
});

// Type definitions for TypeScript
export interface ElectronAPI {
  openFile: () => Promise<FileInfo | null>;
  saveFile: (data: { fileName: string; content: Buffer }) => Promise<string | null>;
  takeScreenshot: () => Promise<string | null>;
  getApiKey: () => Promise<string | null>;
  setApiKey: (apiKey: string) => Promise<boolean>;
  openExternal: (url: string) => Promise<void>;
  onUpdateAvailable: (callback: (info: any) => void) => void;
  onDownloadProgress: (callback: (progress: any) => void) => void;
  onUpdateDownloaded: (callback: (info: any) => void) => void;
  onUpdateError: (callback: (error: any) => void) => void;
  restartApp: () => Promise<void>;
  removeAllListeners: (channel: string) => void;
  platform: string;
}

export interface FileInfo {
  path: string;
  name: string;
  extension: string;
  size: number;
  content: Buffer;
}

declare global {
  interface Window {
    electronAPI: ElectronAPI;
  }
}