// Translate Your Game - Desktop App JavaScript
// Carbon copy of successful localhost:3000 functionality

// Import styles
import './styles.css';

// API Configuration
const API_BASE_URL = 'http://localhost:5002/api/v1';
let API_KEY = localStorage.getItem('apiKey') || 'tk_live_7IezEZ3-pLTSnFsiW7kOkfXIIKWOEhZp9r1H-TWv';

// Global State
let currentFile = null;
let currentTask = null;
let selectedGlossaries = [];
let availableGlossaries = [];

// Initialize app when DOM is ready
document.addEventListener('DOMContentLoaded', () => {
    console.log('✅ Translate Your Game Desktop App Initialized');
    
    // Initialize all components
    initializeTabs();
    initializeFileUpload();
    initializeSettings();
    initializeGlossaryManagement();
    initializeChatbot();
    
    // Load initial data
    loadGlossaries();
    checkAPIStatus();
});

// Tab System
function initializeTabs() {
    const tabButtons = document.querySelectorAll('.tab-btn');
    const tabPanes = document.querySelectorAll('.tab-pane');
    
    tabButtons.forEach(button => {
        button.addEventListener('click', () => {
            const targetTab = button.getAttribute('data-tab');
            
            // Update active states
            tabButtons.forEach(btn => btn.classList.remove('active'));
            tabPanes.forEach(pane => pane.classList.remove('active'));
            
            button.classList.add('active');
            document.getElementById(targetTab).classList.add('active');
        });
    });
}

// File Upload System
function initializeFileUpload() {
    const uploadArea = document.getElementById('upload-area');
    const fileInput = document.getElementById('file-input');
    const browseBtn = document.getElementById('browse-btn');
    const startBtn = document.getElementById('start-translation');
    const cancelBtn = document.getElementById('cancel-translation');
    const newTranslationBtn = document.getElementById('new-translation');
    const downloadBtn = document.getElementById('download-result');
    
    // Browse button
    browseBtn.addEventListener('click', () => fileInput.click());
    
    // File input change
    fileInput.addEventListener('change', (e) => {
        const file = e.target.files[0];
        if (file) handleFileSelect(file);
    });
    
    // Drag and drop
    uploadArea.addEventListener('dragover', (e) => {
        e.preventDefault();
        uploadArea.classList.add('dragging');
    });
    
    uploadArea.addEventListener('dragleave', () => {
        uploadArea.classList.remove('dragging');
    });
    
    uploadArea.addEventListener('drop', (e) => {
        e.preventDefault();
        uploadArea.classList.remove('dragging');
        const file = e.dataTransfer.files[0];
        if (file) handleFileSelect(file);
    });
    
    // Translation controls
    startBtn.addEventListener('click', startTranslation);
    cancelBtn.addEventListener('click', cancelTranslation);
    newTranslationBtn.addEventListener('click', resetTranslation);
    downloadBtn.addEventListener('click', downloadResult);
    
    // Translation mode change
    document.getElementById('translation-mode').addEventListener('change', (e) => {
        const glossarySelector = document.getElementById('glossary-selector').parentElement;
        glossarySelector.style.display = e.target.value === 'smart' ? 'block' : 'none';
    });
}

// Handle file selection
async function handleFileSelect(file) {
    console.log('📁 File selected:', file.name);
    
    // Parse file
    try {
        const fileData = await parseFile(file);
        currentFile = {
            name: file.name,
            type: file.type,
            size: file.size,
            data: fileData
        };
        
        // Show configuration
        document.getElementById('upload-area').style.display = 'none';
        document.getElementById('translation-config').style.display = 'block';
        
        // Update glossary selector
        updateGlossarySelector();
        
    } catch (error) {
        console.error('Error parsing file:', error);
        showNotification('error', 'Failed to parse file: ' + error.message);
    }
}

// Parse file based on type
async function parseFile(file) {
    const extension = file.name.split('.').pop().toLowerCase();
    const text = await file.text();
    
    switch(extension) {
        case 'json':
            return JSON.parse(text);
        case 'csv':
            return parseCSV(text);
        case 'xlsx':
        case 'xls':
            // For Excel files, we need special handling
            // In real app, would use file parser service
            return { entries: [], format: 'excel' };
        default:
            return { entries: text.split('\n'), format: 'text' };
    }
}

// Simple CSV parser
function parseCSV(text) {
    const lines = text.split('\n');
    const entries = [];
    
    for (const line of lines) {
        if (line.trim()) {
            const [source, target] = line.split(',');
            entries.push({ source: source?.trim(), target: target?.trim() });
        }
    }
    
    return { entries, format: 'csv' };
}

// Start translation
async function startTranslation() {
    const mode = document.getElementById('translation-mode').value;
    const sourceLang = document.getElementById('source-lang').value;
    const targetLang = document.getElementById('target-lang').value;
    
    // Validate
    if (!currentFile) {
        showNotification('error', 'No file selected');
        return;
    }
    
    // Get selected glossaries for smart mode
    const glossaryIds = mode === 'smart' ? 
        Array.from(document.querySelectorAll('.glossary-checkbox input:checked'))
            .map(cb => parseInt(cb.value)) : [];
    
    // Hide config, show progress
    document.getElementById('translation-config').style.display = 'none';
    document.getElementById('translation-progress').style.display = 'block';
    
    try {
        // Call API to start translation
        const response = await fetch(`${API_BASE_URL}/tasks/translate-file`, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                'X-API-Key': API_KEY
            },
            body: JSON.stringify({
                file_entries: currentFile.data.entries,
                source_lang: sourceLang,
                target_lang: targetLang,
                translation_mode: mode,
                glossary_ids: glossaryIds
            })
        });
        
        if (!response.ok) throw new Error('Failed to start translation');
        
        const data = await response.json();
        currentTask = data.task_id;
        
        // Start monitoring progress
        monitorTaskProgress();
        
    } catch (error) {
        console.error('Translation error:', error);
        showNotification('error', 'Failed to start translation: ' + error.message);
        resetTranslation();
    }
}

// Monitor task progress
async function monitorTaskProgress() {
    if (!currentTask) return;
    
    try {
        const response = await fetch(`${API_BASE_URL}/tasks/${currentTask}`, {
            headers: { 'X-API-Key': API_KEY }
        });
        
        if (!response.ok) throw new Error('Failed to get task status');
        
        const data = await response.json();
        
        // Update progress UI
        updateProgress(data.progress || 0, data.status_message || 'Processing...');
        
        if (data.status === 'completed') {
            // Show completion
            onTranslationComplete(data.result);
        } else if (data.status === 'failed') {
            throw new Error(data.error || 'Translation failed');
        } else {
            // Continue monitoring
            setTimeout(() => monitorTaskProgress(), 1000);
        }
        
    } catch (error) {
        console.error('Progress monitoring error:', error);
        showNotification('error', 'Error monitoring progress: ' + error.message);
    }
}

// Update progress UI
function updateProgress(percent, message) {
    const fillEl = document.getElementById('progress-fill');
    const textEl = document.getElementById('progress-text');
    const detailsEl = document.getElementById('progress-details');
    
    fillEl.style.width = percent + '%';
    textEl.textContent = percent + '%';
    detailsEl.textContent = message;
}

// Handle translation completion
function onTranslationComplete(result) {
    document.getElementById('translation-progress').style.display = 'none';
    document.getElementById('translation-result').style.display = 'block';
    
    // Store result for download
    currentFile.result = result;
    
    showNotification('success', 'Translation completed successfully!');
}

// Cancel translation
function cancelTranslation() {
    if (currentTask) {
        // In real app, would call API to cancel task
        currentTask = null;
    }
    resetTranslation();
}

// Reset translation UI
function resetTranslation() {
    document.getElementById('upload-area').style.display = 'block';
    document.getElementById('translation-config').style.display = 'none';
    document.getElementById('translation-progress').style.display = 'none';
    document.getElementById('translation-result').style.display = 'none';
    
    // Reset state
    currentFile = null;
    currentTask = null;
    selectedGlossaries = [];
    
    // Reset file input
    document.getElementById('file-input').value = '';
}

// Download result
async function downloadResult() {
    if (!currentFile?.result) return;
    
    try {
        // Use Electron API to save file
        if (window.electronAPI?.saveFile) {
            const content = formatResultForDownload(currentFile.result);
            await window.electronAPI.saveFile({
                fileName: currentFile.name.replace(/\.[^.]+$/, '_translated.txt'),
                content: Buffer.from(content)
            });
        } else {
            // Fallback to browser download
            const content = formatResultForDownload(currentFile.result);
            const blob = new Blob([content], { type: 'text/plain' });
            const url = URL.createObjectURL(blob);
            const a = document.createElement('a');
            a.href = url;
            a.download = currentFile.name.replace(/\.[^.]+$/, '_translated.txt');
            a.click();
            URL.revokeObjectURL(url);
        }
        
        showNotification('success', 'File downloaded successfully!');
    } catch (error) {
        console.error('Download error:', error);
        showNotification('error', 'Failed to download file');
    }
}

// Format result for download
function formatResultForDownload(result) {
    if (Array.isArray(result)) {
        return result.map(entry => 
            `${entry.source || entry.text}\t${entry.translation}`
        ).join('\n');
    }
    return JSON.stringify(result, null, 2);
}

// Settings Management
function initializeSettings() {
    const settingsBtn = document.getElementById('settings-btn');
    const closeBtn = document.getElementById('close-settings');
    const modal = document.getElementById('settings-modal');
    const saveBtn = document.getElementById('save-api-key');
    const apiKeyInput = document.getElementById('api-key-input');
    
    // Show/hide modal
    settingsBtn.addEventListener('click', () => {
        modal.style.display = 'flex';
        apiKeyInput.value = API_KEY;
    });
    
    closeBtn.addEventListener('click', () => {
        modal.style.display = 'none';
    });
    
    // Save API key
    saveBtn.addEventListener('click', async () => {
        const newKey = apiKeyInput.value.trim();
        if (newKey) {
            API_KEY = newKey;
            localStorage.setItem('apiKey', newKey);
            await checkAPIStatus();
            showNotification('success', 'API key saved!');
        }
    });
}

// Check API status
async function checkAPIStatus() {
    const statusEl = document.getElementById('api-status');
    statusEl.textContent = 'Checking...';
    statusEl.style.color = '#a0aec0';
    
    try {
        const response = await fetch(`${API_BASE_URL}/health`, {
            headers: { 'X-API-Key': API_KEY }
        });
        
        if (response.ok) {
            statusEl.textContent = '✅ Connected';
            statusEl.style.color = '#48bb78';
        } else {
            statusEl.textContent = '❌ Invalid API key';
            statusEl.style.color = '#f56565';
        }
    } catch (error) {
        statusEl.textContent = '❌ Connection failed';
        statusEl.style.color = '#f56565';
    }
}

// Glossary Management
function initializeGlossaryManagement() {
    const createBtn = document.getElementById('create-glossary');
    const backBtn = document.getElementById('back-to-list');
    const editBtn = document.getElementById('edit-glossary');
    const deleteBtn = document.getElementById('delete-glossary');
    
    // Modal elements
    const closeCreateModal = document.getElementById('close-create-glossary');
    const confirmCreateBtn = document.getElementById('confirm-create-glossary');
    const cancelCreateBtn = document.getElementById('cancel-create-glossary');
    const nameInput = document.getElementById('glossary-name-input');
    
    createBtn.addEventListener('click', createNewGlossary);
    backBtn.addEventListener('click', showGlossaryList);
    editBtn.addEventListener('click', editCurrentGlossary);
    deleteBtn.addEventListener('click', deleteCurrentGlossary);
    
    // Modal event listeners
    closeCreateModal.addEventListener('click', () => {
        document.getElementById('create-glossary-modal').style.display = 'none';
    });
    
    cancelCreateBtn.addEventListener('click', () => {
        document.getElementById('create-glossary-modal').style.display = 'none';
    });
    
    confirmCreateBtn.addEventListener('click', confirmCreateGlossary);
    
    // Enter key support for name input
    nameInput.addEventListener('keypress', (e) => {
        if (e.key === 'Enter') {
            confirmCreateGlossary();
        }
    });
}

// Load glossaries
async function loadGlossaries() {
    try {
        console.log('🔄 Loading glossaries...');
        const response = await fetch(`${API_BASE_URL}/glossaries`, {
            headers: { 'X-API-Key': API_KEY }
        });
        
        if (!response.ok) throw new Error('Failed to load glossaries');
        
        const responseData = await response.json();
        console.log('📊 Glossaries API response:', responseData);
        
        // Handle API v1 response format
        if (responseData.status === 'success' && responseData.data) {
            availableGlossaries = responseData.data.glossaries || [];
            console.log('✅ Loaded glossaries:', availableGlossaries.length);
        } else {
            throw new Error('Invalid response format');
        }
        
        // Update UI
        updateGlossaryList();
        updateGlossarySelector();
        
    } catch (error) {
        console.error('❌ Error loading glossaries:', error);
        // Show error in UI
        const listEl = document.getElementById('glossary-list');
        if (listEl) {
            listEl.innerHTML = '<div class="glossary-loading" style="color: #f56565;">Failed to load glossaries. Check API connection.</div>';
        }
    }
}

// Update glossary list UI
function updateGlossaryList() {
    console.log('🎨 Updating glossary list UI...');
    const listEl = document.getElementById('glossary-list');
    
    if (!listEl) {
        console.error('❌ glossary-list element not found!');
        return;
    }
    
    if (availableGlossaries.length === 0) {
        console.log('📝 No glossaries found, showing empty message');
        listEl.innerHTML = '<div class="glossary-loading">No glossaries found. Create your first glossary!</div>';
        return;
    }
    
    console.log('📋 Rendering', availableGlossaries.length, 'glossaries');
    listEl.innerHTML = availableGlossaries.map(glossary => `
        <div class="glossary-item" data-glossary-id="${glossary.id}">
            <h4>${glossary.name}</h4>
            <p>${glossary.entry_count || 0} entries</p>
            <p>Created: ${new Date(glossary.created_at).toLocaleDateString()}</p>
        </div>
    `).join('');
    
    // Add event delegation for glossary items
    listEl.addEventListener('click', (e) => {
        const glossaryItem = e.target.closest('.glossary-item');
        if (glossaryItem) {
            const glossaryId = parseInt(glossaryItem.getAttribute('data-glossary-id'));
            if (glossaryId) {
                viewGlossary(glossaryId);
            }
        }
    });
    console.log('✅ Glossary list updated successfully');
}

// Update glossary selector
function updateGlossarySelector() {
    const selectorEl = document.getElementById('glossary-selector');
    
    if (availableGlossaries.length === 0) {
        selectorEl.innerHTML = '<div class="glossary-loading">No glossaries available</div>';
        return;
    }
    
    selectorEl.innerHTML = availableGlossaries.map(glossary => `
        <label class="glossary-checkbox">
            <input type="checkbox" value="${glossary.id}">
            <span>${glossary.name} (${glossary.entry_count || 0} entries)</span>
        </label>
    `).join('');
}

// View glossary details
window.viewGlossary = async function(glossaryId) {
    try {
        // Fetch glossary info
        const glossaryResponse = await fetch(`${API_BASE_URL}/glossaries/${glossaryId}`, {
            headers: { 'X-API-Key': API_KEY }
        });
        
        if (!glossaryResponse.ok) throw new Error('Failed to load glossary');
        
        const glossaryData = await glossaryResponse.json();
        
        // Handle API v1 response format
        if (glossaryData.status !== 'success' || !glossaryData.data) {
            throw new Error('Invalid glossary response format');
        }
        
        const glossary = glossaryData.data;
        
        // Fetch entries
        const entriesResponse = await fetch(`${API_BASE_URL}/glossaries/${glossaryId}/entries`, {
            headers: { 'X-API-Key': API_KEY }
        });
        
        if (!entriesResponse.ok) throw new Error('Failed to load glossary entries');
        
        const entriesData = await entriesResponse.json();
        
        // Handle API v1 response format for entries
        let entries = [];
        if (entriesData.status === 'success' && entriesData.data) {
            entries = entriesData.data.entries || [];
        }
        
        // Show detail view
        document.getElementById('glossary-list').style.display = 'none';
        document.getElementById('glossary-detail').style.display = 'block';
        document.getElementById('glossary-name').textContent = glossary.name;
        
        // Display entries
        const entriesEl = document.getElementById('glossary-entries');
        entriesEl.innerHTML = entries.map(entry => `
            <div class="glossary-entry">
                <span>${entry.source_text}</span>
                <span>→</span>
                <span>${entry.target_text}</span>
            </div>
        `).join('');
        
    } catch (error) {
        console.error('Error loading glossary:', error);
        showNotification('error', 'Failed to load glossary details');
    }
};

// Show glossary list
function showGlossaryList() {
    document.getElementById('glossary-list').style.display = 'grid';
    document.getElementById('glossary-detail').style.display = 'none';
}

// Show create glossary modal
function createNewGlossary() {
    const modal = document.getElementById('create-glossary-modal');
    modal.style.display = 'flex';
    
    // Clear previous values
    document.getElementById('glossary-name-input').value = '';
    document.getElementById('glossary-source-lang').value = 'ko';
    document.getElementById('glossary-target-lang').value = 'en';
    
    // Focus on name input
    setTimeout(() => {
        document.getElementById('glossary-name-input').focus();
    }, 100);
}

// Actually create the glossary
async function confirmCreateGlossary() {
    const name = document.getElementById('glossary-name-input').value.trim();
    const sourceLang = document.getElementById('glossary-source-lang').value;
    const targetLang = document.getElementById('glossary-target-lang').value;
    
    if (!name) {
        showNotification('error', 'Please enter a glossary name');
        return;
    }
    
    try {
        const response = await fetch(`${API_BASE_URL}/glossaries`, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                'X-API-Key': API_KEY
            },
            body: JSON.stringify({ 
                name,
                source_language: sourceLang,
                target_language: targetLang
            })
        });
        
        if (!response.ok) throw new Error('Failed to create glossary');
        
        // Close modal
        document.getElementById('create-glossary-modal').style.display = 'none';
        
        showNotification('success', 'Glossary created successfully!');
        await loadGlossaries();
        
    } catch (error) {
        console.error('Error creating glossary:', error);
        showNotification('error', 'Failed to create glossary');
    }
}

// Edit glossary
function editCurrentGlossary() {
    showNotification('info', 'Edit functionality coming soon!');
}

// Delete glossary
async function deleteCurrentGlossary() {
    if (!confirm('Are you sure you want to delete this glossary?')) return;
    
    // Get glossary ID from current view
    const glossaryName = document.getElementById('glossary-name').textContent;
    const glossary = availableGlossaries.find(g => g.name === glossaryName);
    
    if (!glossary) return;
    
    try {
        const response = await fetch(`${API_BASE_URL}/glossaries/${glossary.id}`, {
            method: 'DELETE',
            headers: { 'X-API-Key': API_KEY }
        });
        
        if (!response.ok) throw new Error('Failed to delete glossary');
        
        showNotification('success', 'Glossary deleted successfully!');
        showGlossaryList();
        await loadGlossaries();
        
    } catch (error) {
        console.error('Error deleting glossary:', error);
        showNotification('error', 'Failed to delete glossary');
    }
}

// Chatbot Translation
function initializeChatbot() {
    const translateBtn = document.getElementById('translate-text');
    const textInput = document.getElementById('chatbot-text');
    
    translateBtn.addEventListener('click', translateChatbotText);
    
    // Enter key support
    textInput.addEventListener('keypress', (e) => {
        if (e.key === 'Enter' && !e.shiftKey) {
            e.preventDefault();
            translateChatbotText();
        }
    });
}

// Translate chatbot text
async function translateChatbotText() {
    const text = document.getElementById('chatbot-text').value.trim();
    const sourceLang = document.getElementById('chatbot-source').value;
    const targetLang = document.getElementById('chatbot-target').value;
    
    if (!text) return;
    
    // Add message to chat
    addChatMessage('user', text);
    
    // Clear input
    document.getElementById('chatbot-text').value = '';
    
    try {
        const response = await fetch(`${API_BASE_URL}/translate`, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                'X-API-Key': API_KEY
            },
            body: JSON.stringify({
                text,
                source_lang: sourceLang,
                target_lang: targetLang
            })
        });
        
        if (!response.ok) throw new Error('Translation failed');
        
        const responseData = await response.json();
        
        // Handle API v1 response format
        if (responseData.status === 'success' && responseData.data) {
            addChatMessage('assistant', responseData.data.translation);
        } else {
            throw new Error('Invalid response format');
        }
        
    } catch (error) {
        console.error('Translation error:', error);
        addChatMessage('error', 'Failed to translate. Please try again.');
    }
}

// Add message to chat
function addChatMessage(type, text) {
    const messagesEl = document.getElementById('chatbot-messages');
    
    // Remove welcome message if exists
    const welcomeMsg = messagesEl.querySelector('.welcome-message');
    if (welcomeMsg) welcomeMsg.remove();
    
    const messageEl = document.createElement('div');
    messageEl.className = `chat-message ${type}`;
    messageEl.innerHTML = `
        <div class="message-content">
            ${type === 'user' ? '👤' : type === 'assistant' ? '🤖' : '⚠️'} ${text}
        </div>
    `;
    
    messagesEl.appendChild(messageEl);
    messagesEl.scrollTop = messagesEl.scrollHeight;
}

// Notification system
function showNotification(type, message) {
    // Simple notification implementation
    const notification = document.createElement('div');
    notification.className = `notification notification-${type} fade-in`;
    notification.style.cssText = `
        position: fixed;
        top: 20px;
        right: 20px;
        padding: 16px 24px;
        background: ${type === 'success' ? '#48bb78' : type === 'error' ? '#f56565' : '#4299e1'};
        color: white;
        border-radius: 8px;
        box-shadow: 0 4px 12px rgba(0,0,0,0.15);
        z-index: 9999;
    `;
    notification.textContent = message;
    
    document.body.appendChild(notification);
    
    setTimeout(() => {
        notification.style.opacity = '0';
        setTimeout(() => notification.remove(), 300);
    }, 3000);
}

// Initialize Electron API bridge
if (window.electronAPI) {
    console.log('✅ Electron API available');
    
    // Override file selection with native dialog
    const originalBrowseBtn = document.getElementById('browse-btn');
    if (originalBrowseBtn) {
        const newBrowseBtn = originalBrowseBtn.cloneNode(true);
        originalBrowseBtn.parentNode.replaceChild(newBrowseBtn, originalBrowseBtn);
        
        newBrowseBtn.addEventListener('click', async () => {
            const fileInfo = await window.electronAPI.openFile();
            if (fileInfo) {
                const file = new File([fileInfo.content], fileInfo.name, {
                    type: 'application/octet-stream'
                });
                handleFileSelect(file);
            }
        });
    }
}