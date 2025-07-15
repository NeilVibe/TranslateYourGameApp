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
        this.config = this.loadConfig();
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
            
            // Encrypt sensitive fields if encryption is available
            if (safeStorage.isEncryptionAvailable() && toSave.apiKey && typeof toSave.apiKey === 'string') {
                const encrypted = safeStorage.encryptString(toSave.apiKey);
                toSave.apiKey = {
                    encrypted: true,
                    data: encrypted.toString('base64')
                };
            }
            
            fs.writeFileSync(this.configPath, JSON.stringify(toSave, null, 2));
            return true;
        } catch (error) {
            console.error('Error saving secure config:', error);
            return false;
        }
    }

    // Get API key
    getApiKey(): string | null {
        return typeof this.config.apiKey === 'string' ? this.config.apiKey : null;
    }

    // Set API key
    setApiKey(apiKey: string): boolean {
        this.config.apiKey = apiKey;
        return this.saveConfig();
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