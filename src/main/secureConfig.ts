// Secure configuration management using Electron's safeStorage API
import { safeStorage, app } from 'electron';
import * as fs from 'fs';
import * as path from 'path';
import log from 'electron-log';

interface ConfigData {
    apiKey: string | null | { encrypted: boolean; data: string };
    apiBaseUrl: string;
}

class SecureConfig {
    private configPath: string;
    private config: ConfigData;
    
    constructor() {
        this.configPath = path.join(app.getPath('userData'), 'secure-config.json');
        log.info('SecureConfig: Config path:', this.configPath);
        log.info('SecureConfig: Platform:', process.platform);
        log.info('SecureConfig: User data path:', app.getPath('userData'));
        log.info('SecureConfig: Encryption available:', safeStorage.isEncryptionAvailable());
        this.config = this.loadConfig();
        log.info('SecureConfig: Initial config loaded:', this.config);
    }

    // Load configuration from disk
    loadConfig(): ConfigData {
        try {
            if (fs.existsSync(this.configPath)) {
                const data = fs.readFileSync(this.configPath, 'utf8');
                const parsed = JSON.parse(data);
                
                // Handle encrypted API key with robust fallback
                if (parsed.apiKey && typeof parsed.apiKey === 'object' && parsed.apiKey.encrypted) {
                    log.info('SecureConfig: Found encrypted API key, attempting decryption...');
                    
                    if (safeStorage.isEncryptionAvailable()) {
                        try {
                            const decrypted = safeStorage.decryptString(Buffer.from(parsed.apiKey.data, 'base64'));
                            parsed.apiKey = decrypted;
                            log.info('SecureConfig: Successfully decrypted API key');
                        } catch (decryptError) {
                            log.error('SecureConfig: Failed to decrypt API key:', decryptError);
                            // Keep encrypted object for later retry
                            log.info('SecureConfig: Will retry decryption when encryption becomes available');
                        }
                    } else {
                        log.warn('SecureConfig: Encryption not available during startup, will retry later');
                        // Keep encrypted object for later retry
                    }
                }
                
                return parsed;
            }
        } catch (error) {
            log.error('Error loading secure config:', error);
        }
        
        // Return default config without hardcoded keys
        return {
            apiKey: null,
            apiBaseUrl: 'http://localhost:5002/api/v1'
        };
    }

    // Save configuration to disk
    saveConfig(): boolean {
        try {
            const toSave = { ...this.config };
            
            log.info('SecureConfig: Saving config to:', this.configPath);
            log.info('SecureConfig: Directory exists:', fs.existsSync(path.dirname(this.configPath)));
            
            // Ensure directory exists
            const dir = path.dirname(this.configPath);
            if (!fs.existsSync(dir)) {
                log.info('SecureConfig: Creating directory:', dir);
                fs.mkdirSync(dir, { recursive: true });
            }
            
            // Encrypt sensitive fields if encryption is available
            if (safeStorage.isEncryptionAvailable() && toSave.apiKey && typeof toSave.apiKey === 'string') {
                log.info('SecureConfig: Using encryption for API key');
                const encrypted = safeStorage.encryptString(toSave.apiKey);
                toSave.apiKey = {
                    encrypted: true,
                    data: encrypted.toString('base64')
                };
            } else {
                log.info('SecureConfig: Encryption not available, saving as plain text');
            }
            
            fs.writeFileSync(this.configPath, JSON.stringify(toSave, null, 2));
            log.info('SecureConfig: File written successfully');
            
            // Verify file was written
            const exists = fs.existsSync(this.configPath);
            log.info('SecureConfig: File exists after write:', exists);
            
            return true;
        } catch (error) {
            log.error('Error saving secure config:', error);
            log.error('Error details:', {
                name: (error as Error).name,
                message: (error as Error).message,
                stack: (error as Error).stack
            });
            return false;
        }
    }

    // Get API key with retry logic for Windows encryption timing
    getApiKey(): string | null {
        log.info('SecureConfig: Getting API key, current config:', this.config);
        
        // If we have an encrypted key that hasn't been decrypted yet, try now
        if (this.config.apiKey && typeof this.config.apiKey === 'object' && this.config.apiKey.encrypted) {
            log.info('SecureConfig: Found encrypted API key, attempting delayed decryption...');
            
            if (safeStorage.isEncryptionAvailable()) {
                try {
                    const decrypted = safeStorage.decryptString(Buffer.from(this.config.apiKey.data, 'base64'));
                    this.config.apiKey = decrypted;
                    log.info('SecureConfig: Successfully decrypted API key on retry');
                    // Save the decrypted version for future use
                    this.saveConfig();
                } catch (decryptError) {
                    log.error('SecureConfig: Failed to decrypt API key on retry:', decryptError);
                    return null;
                }
            } else {
                log.warn('SecureConfig: Encryption still not available, returning null');
                return null;
            }
        }
        
        const result = typeof this.config.apiKey === 'string' ? this.config.apiKey : null;
        log.info('SecureConfig: Returning API key:', result ? result.substring(0, 20) + '...' : 'null');
        return result;
    }

    // Set API key
    setApiKey(apiKey: string): boolean {
        log.info('SecureConfig: Setting API key:', apiKey.substring(0, 20) + '...');
        this.config.apiKey = apiKey;
        const result = this.saveConfig();
        log.info('SecureConfig: Save result:', result);
        log.info('SecureConfig: Config after save:', this.config);
        return result;
    }

    // Clear API key
    clearApiKey(): boolean {
        this.config.apiKey = null;
        return this.saveConfig();
    }

    // Get API base URL
    getApiBaseUrl(): string {
        return this.config.apiBaseUrl || 'http://localhost:5002/api/v1';
    }

    // Set API base URL
    setApiBaseUrl(url: string): boolean {
        this.config.apiBaseUrl = url;
        return this.saveConfig();
    }

    // Check if API key is configured
    hasApiKey(): boolean {
        return !!this.config.apiKey && typeof this.config.apiKey === 'string';
    }
}

// Export singleton instance
export default new SecureConfig();