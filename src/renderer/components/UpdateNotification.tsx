import React, { useState, useEffect } from 'react';
import { notification, Button, Progress } from 'antd';
import { DownloadOutlined, ReloadOutlined } from '@ant-design/icons';

const UpdateNotification: React.FC = () => {
  const [updateAvailable, setUpdateAvailable] = useState(false);
  const [downloadProgress, setDownloadProgress] = useState(0);
  const [updateReady, setUpdateReady] = useState(false);
  const [updateVersion, setUpdateVersion] = useState('');

  useEffect(() => {
    // Listen for update events from main process
    const handleUpdateAvailable = (info: any) => {
      setUpdateAvailable(true);
      setUpdateVersion(info.version);
      
      notification.info({
        message: 'Update Available',
        description: `Version ${info.version} is available and will be downloaded in the background.`,
        icon: <DownloadOutlined style={{ color: '#1890ff' }} />,
        duration: 5,
      });
    };

    const handleDownloadProgress = (progress: any) => {
      setDownloadProgress(Math.round(progress.percent));
    };

    const handleUpdateDownloaded = (info: any) => {
      setUpdateReady(true);
      setUpdateAvailable(false);
      
      notification.success({
        message: 'Update Ready',
        description: (
          <div>
            <p>Version {info.version} has been downloaded and is ready to install.</p>
            <Button 
              type="primary" 
              icon={<ReloadOutlined />}
              onClick={() => {
                if (window.electronAPI?.restartApp) {
                  window.electronAPI.restartApp();
                }
              }}
            >
              Restart Now
            </Button>
          </div>
        ),
        duration: 0, // Don't auto-close
        key: 'update-ready',
      });
    };

    const handleUpdateError = (error: any) => {
      notification.error({
        message: 'Update Error',
        description: 'Failed to check for updates. Please try again later.',
        duration: 5,
      });
    };

    // Add IPC listeners if available
    if (window.electronAPI?.onUpdateAvailable) {
      window.electronAPI.onUpdateAvailable(handleUpdateAvailable);
    }
    if (window.electronAPI?.onDownloadProgress) {
      window.electronAPI.onDownloadProgress(handleDownloadProgress);
    }
    if (window.electronAPI?.onUpdateDownloaded) {
      window.electronAPI.onUpdateDownloaded(handleUpdateDownloaded);
    }
    if (window.electronAPI?.onUpdateError) {
      window.electronAPI.onUpdateError(handleUpdateError);
    }

    return () => {
      // Cleanup listeners
      if (window.electronAPI?.removeAllListeners) {
        window.electronAPI.removeAllListeners('update-available');
        window.electronAPI.removeAllListeners('download-progress');
        window.electronAPI.removeAllListeners('update-downloaded');
        window.electronAPI.removeAllListeners('update-error');
      }
    };
  }, []);

  // Show download progress notification
  useEffect(() => {
    if (updateAvailable && downloadProgress > 0 && downloadProgress < 100) {
      notification.info({
        message: 'Downloading Update',
        description: (
          <div>
            <p>Downloading version {updateVersion}...</p>
            <Progress percent={downloadProgress} size="small" />
          </div>
        ),
        key: 'download-progress',
        duration: 0, // Don't auto-close while downloading
      });
    } else if (downloadProgress === 100) {
      notification.destroy('download-progress');
    }
  }, [downloadProgress, updateAvailable, updateVersion]);

  return null; // This component doesn't render anything visible
};

export default UpdateNotification;