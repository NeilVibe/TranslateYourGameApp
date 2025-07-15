// Electron API type definitions
interface ElectronAPI {
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

interface FileInfo {
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