// Web version of Electron API - for browser development
export const webAPI = {
  // File operations for web
  openFile: (): Promise<any> => {
    return new Promise((resolve) => {
      const input = document.createElement('input');
      input.type = 'file';
      input.accept = '.xlsx,.xls,.csv,.json,.xml,.po,.pot';
      
      input.onchange = (e) => {
        const file = (e.target as HTMLInputElement).files?.[0];
        if (file) {
          const reader = new FileReader();
          reader.onload = () => {
            const result = reader.result as ArrayBuffer;
            resolve({
              path: file.name,
              name: file.name,
              extension: '.' + file.name.split('.').pop()?.toLowerCase(),
              size: file.size,
              content: Buffer.from(result)
            });
          };
          reader.readAsArrayBuffer(file);
        } else {
          resolve(null);
        }
      };
      
      input.click();
    });
  },

  saveFile: (data: { fileName: string; content: Buffer }): Promise<string | null> => {
    return new Promise((resolve) => {
      try {
        const blob = new Blob([data.content], { type: 'application/octet-stream' });
        const url = URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = data.fileName;
        document.body.appendChild(a);
        a.click();
        document.body.removeChild(a);
        URL.revokeObjectURL(url);
        resolve(data.fileName);
      } catch (error) {
        console.error('Save failed:', error);
        resolve(null);
      }
    });
  },

  takeScreenshot: (): Promise<string | null> => {
    // Not available in web version
    return Promise.resolve(null);
  },

  getApiKey: (): Promise<string | null> => {
    // Get API key from localStorage
    const apiKey = localStorage.getItem('apiKey');
    return Promise.resolve(apiKey);
  },

  setApiKey: (apiKey: string): Promise<boolean> => {
    try {
      localStorage.setItem('apiKey', apiKey);
      return Promise.resolve(true);
    } catch {
      return Promise.resolve(false);
    }
  },

  openExternal: (url: string): Promise<void> => {
    try {
      // Try window.open first (opens in new tab)
      const newWindow = window.open(url, '_blank', 'noopener,noreferrer');
      
      // If window.open was blocked (returns null), use location.href as fallback
      if (!newWindow || newWindow.closed || typeof newWindow.closed === 'undefined') {
        // Fallback: navigate current window
        window.location.href = url;
      }
    } catch (error) {
      // If all else fails, use location.href
      console.warn('window.open failed, using location.href fallback:', error);
      window.location.href = url;
    }
    return Promise.resolve();
  },

  platform: 'web'
};

// Set up the API for web development
if (typeof window !== 'undefined' && !window.electronAPI) {
  (window as any).electronAPI = webAPI;
}