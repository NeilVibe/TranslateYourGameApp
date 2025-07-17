// Secure configuration management using Electron's safeStorage API
import { safeStorage, app } from 'electron';
import * as fs from 'fs';
import * as path from 'path';

interface ConfigData {
    apiKey: string | null | { encrypted: boolean; data: string };
    apiBaseUrl: string;
}

class SecureConfig {
    private configPath: string;
    private config: ConfigData;
    
    constructor() {
        this.configPath = path.join(app.getPath('userData'), 'secure-config.json');
        console.log('SecureConfig: Config path:', this.configPath);
        console.log('SecureConfig: Platform:', process.platform);
        console.log('SecureConfig: User data path:', app.getPath('userData'));
        console.log('SecureConfig: Encryption available:', safeStorage.isEncryptionAvailable());
        this.config = this.loadConfig();
        console.log('SecureConfig: Initial config loaded:', this.config);
    }

    // Load configuration from disk
    loadConfig(): ConfigData {
        try {
            if (fs.existsSync(this.configPath)) {
                const data = fs.readFileSync(this.configPath, 'utf8');
                const parsed = JSON.parse(data);
                
                // Decrypt sensitive fields if encryption is available
                if (safeStorage.isEncryptionAvailable() && parsed.apiKey && typeof parsed.apiKey === 'object' && parsed.apiKey.encrypted) {
                    parsed.apiKey = safeStorage.decryptString(Buffer.from(parsed.apiKey.data, 'base64'));
                }
                
                return parsed;
            }
        } catch (error) {
            console.error('Error loading secure config:', error);
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
            
            console.log('SecureConfig: Saving config to:', this.configPath);
            console.log('SecureConfig: Directory exists:', fs.existsSync(path.dirname(this.configPath)));
            
            // Ensure directory exists
            const dir = path.dirname(this.configPath);
            if (!fs.existsSync(dir)) {
                console.log('SecureConfig: Creating directory:', dir);
                fs.mkdirSync(dir, { recursive: true });
            }
            
            // Encrypt sensitive fields if encryption is available
            if (safeStorage.isEncryptionAvailable() && toSave.apiKey && typeof toSave.apiKey === 'string') {
                console.log('SecureConfig: Using encryption for API key');
                const encrypted = safeStorage.encryptString(toSave.apiKey);
                toSave.apiKey = {
                    encrypted: true,
                    data: encrypted.toString('base64')
                };
            } else {
                console.log('SecureConfig: Encryption not available, saving as plain text');
            }
            
            fs.writeFileSync(this.configPath, JSON.stringify(toSave, null, 2));
            console.log('SecureConfig: File written successfully');
            
            // Verify file was written
            const exists = fs.existsSync(this.configPath);
            console.log('SecureConfig: File exists after write:', exists);
            
            return true;
        } catch (error) {
            console.error('Error saving secure config:', error);
            console.error('Error details:', {
                name: (error as Error).name,
                message: (error as Error).message,
                stack: (error as Error).stack
            });
            return false;
        }
    }

    // Get API key
    getApiKey(): string | null {
        console.log('SecureConfig: Getting API key, current config:', this.config);
        const result = typeof this.config.apiKey === 'string' ? this.config.apiKey : null;
        console.log('SecureConfig: Returning API key:', result ? result.substring(0, 20) + '...' : 'null');
        return result;
    }

    // Set API key
    setApiKey(apiKey: string): boolean {
        console.log('SecureConfig: Setting API key:', apiKey.substring(0, 20) + '...');
        this.config.apiKey = apiKey;
        const result = this.saveConfig();
        console.log('SecureConfig: Save result:', result);
        console.log('SecureConfig: Config after save:', this.config);
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