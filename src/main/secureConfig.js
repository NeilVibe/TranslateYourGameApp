// Secure configuration management using Electron's safeStorage API
const { safeStorage, app } = require('electron');
const fs = require('fs');
const path = require('path');

class SecureConfig {
    constructor() {
        this.configPath = path.join(app.getPath('userData'), 'secure-config.json');
        this.config = this.loadConfig();
    }

    // Load configuration from disk
    loadConfig() {
        try {
            if (fs.existsSync(this.configPath)) {
                const data = fs.readFileSync(this.configPath, 'utf8');
                const parsed = JSON.parse(data);
                
                // Decrypt sensitive fields if encryption is available
                if (safeStorage.isEncryptionAvailable() && parsed.apiKey && parsed.apiKey.encrypted) {
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
    saveConfig() {
        try {
            const toSave = { ...this.config };
            
            // Encrypt sensitive fields if encryption is available
            if (safeStorage.isEncryptionAvailable() && toSave.apiKey) {
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
    getApiKey() {
        return this.config.apiKey;
    }

    // Set API key
    setApiKey(apiKey) {
        this.config.apiKey = apiKey;
        return this.saveConfig();
    }

    // Clear API key
    clearApiKey() {
        this.config.apiKey = null;
        return this.saveConfig();
    }

    // Get API base URL
    getApiBaseUrl() {
        return this.config.apiBaseUrl || 'http://localhost:5002/api/v1';
    }

    // Set API base URL
    setApiBaseUrl(url) {
        this.config.apiBaseUrl = url;
        return this.saveConfig();
    }

    // Check if API key is configured
    hasApiKey() {
        return !!this.config.apiKey;
    }
}

// Export singleton instance
module.exports = new SecureConfig();