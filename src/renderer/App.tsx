import React, { useState, useEffect } from 'react';
import { ConfigProvider, Layout, message, notification, theme, App as AntdApp } from 'antd';
import { useTranslation } from 'react-i18next';
import enUS from 'antd/locale/en_US';
import koKR from 'antd/locale/ko_KR';
import frFR from 'antd/locale/fr_FR';
import apiClient from './services/apiClient';
import fileParser from './services/fileParser';
import Header from './components/Header';
import SettingsModal from './components/SettingsModal';
import GlossarySelector from './components/GlossarySelector';
import MinimalChatbotTranslation from './components/MinimalChatbotTranslation';
import ProfessionalGlossaryManager from './components/ProfessionalGlossaryManager';
import ProfessionalFileTranslation from './components/ProfessionalFileTranslation';
import TasksTab from './components/TasksTab';
import UpdateNotification from './components/UpdateNotification';
import './i18n'; // Initialize i18n
import './App.css';

const { Content } = Layout;

// Ant Design locale mapping
const getAntdLocale = (language: string) => {
  switch (language) {
    case 'ko':
      return koKR;
    case 'fr':
      return frFR;
    default:
      return enUS;
  }
};

interface AppState {
  apiKey: string | null;
  isProcessing: boolean;
  currentTask: any | null;
  selectedGlossaries: number[];
  sourceLanguage: string;
  targetLanguage: string;
  tokenBalance: number | null;
  currentTab: string;
}

function App() {
  console.log('App component rendering...');
  
  const { i18n } = useTranslation();
  
  const [state, setState] = useState<AppState>({
    apiKey: null,
    isProcessing: false,
    currentTask: null,
    selectedGlossaries: [],
    sourceLanguage: 'en',
    targetLanguage: 'ko',
    tokenBalance: null,
    currentTab: 'chatbot'
  });

  const [settingsVisible, setSettingsVisible] = useState(false);
  const [fileInfo, setFileInfo] = useState<any>(null);
  const [parseResult, setParseResult] = useState<any>(null);

  // Load API key on startup
  useEffect(() => {
    console.log('App useEffect running...');
    loadApiKey();
  }, []);

  const loadApiKey = async () => {
    try {
      let key = null;
      
      // Try Electron API first (for desktop app)
      if (window.electronAPI && window.electronAPI.getApiKey) {
        key = await window.electronAPI.getApiKey();
      } else {
        // Fallback to localStorage for web version
        key = localStorage.getItem('apiKey');
      }
      
      if (key) {
        setState(prev => ({ ...prev, apiKey: key }));
        apiClient.setApiKey(key);
        loadUserInfo();
      } else {
        setSettingsVisible(true);
      }
    } catch (error) {
      console.error('Error loading API key:', error);
      // Fallback to localStorage if Electron API fails
      const fallbackKey = localStorage.getItem('apiKey');
      if (fallbackKey) {
        setState(prev => ({ ...prev, apiKey: fallbackKey }));
        apiClient.setApiKey(fallbackKey);
        loadUserInfo();
      } else {
        setSettingsVisible(true);
      }
    }
  };

  const loadUserInfo = async () => {
    try {
      const [userInfo, tokenBalance] = await Promise.all([
        apiClient.getUserInfo(),
        apiClient.getTokenBalance()
      ]);
      
      setState(prev => ({
        ...prev,
        tokenBalance: tokenBalance.data.balance
      }));
    } catch (error) {
      console.error('Error loading user info:', error);
      message.error('Failed to connect to API. Please check your API key.');
    }
  };

  const handleApiKeyUpdate = async (apiKey: string) => {
    try {
      // Try Electron API first (for desktop app)
      if (window.electronAPI && window.electronAPI.setApiKey) {
        await window.electronAPI.setApiKey(apiKey);
      } else {
        // Fallback to localStorage for web version
        localStorage.setItem('apiKey', apiKey);
      }
      
      apiClient.setApiKey(apiKey);
      setState(prev => ({ ...prev, apiKey }));
      await loadUserInfo();
      message.success('API key saved successfully');
      setSettingsVisible(false);
    } catch (error) {
      console.error('Error saving API key:', error);
      message.error('Failed to save API key');
    }
  };

  const handleFileSelect = async (file: File) => {
    try {
      const fileObj = await window.electronAPI.openFile();
      if (!fileObj) return;

      setFileInfo(fileObj);
      message.info('Parsing file...');

      const parsed = await fileParser.parseFile(fileObj);
      setParseResult(parsed);
      
      message.success(`Found ${parsed.entries.length} entries to translate`);
    } catch (error: any) {
      message.error(`Failed to parse file: ${error.message}`);
    }
  };

  const handleStartTranslation = async (translationData?: any) => {
    if (!state.apiKey) return;

    try {
      // Use translationData if provided (from ProfessionalFileTranslation)
      // Otherwise use parseResult (legacy support)
      let response;
      let entryCount = 0;
      
      if (translationData && translationData.taskId) {
        // New workflow: Use existing parsed task and start translation
        response = await apiClient.startTranslationFromParsedFile(
          translationData.taskId,
          translationData.sourceLanguage,
          translationData.targetLanguage,
          translationData.translationMode,
          translationData.useGlossaries,
          translationData.selectedGlossaries
        );
        entryCount = translationData.segments.length;
      } else if (parseResult) {
        // Legacy workflow: Direct file translation
        response = await apiClient.translateFile({
          file_entries: parseResult.entries.map((entry: any) => ({
            source: entry.source,
            metadata: entry.metadata
          })),
          source_lang: state.sourceLanguage,
          target_lang: state.targetLanguage,
          glossary_ids: state.selectedGlossaries
        });
        entryCount = parseResult.entries.length;
      } else {
        return; // No data to translate
      }

      const taskId = response.data.task_id;
      
      // Show sliding notification instead of blocking progress
      notification.open({
        message: 'File Translation Started',
        description: `Translating ${entryCount} entries. View progress in the Tasks tab.`,
        duration: 4.5,
        style: {
          background: 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)',
          color: 'white',
          borderRadius: '8px'
        }
      });

      // RETURN TO NEUTRAL STATE - no more blocking progress UI
      setState(prev => ({ 
        ...prev, 
        isProcessing: false,  // Return to neutral
        currentTask: null,    // Clear old task
        currentTab: 'tasks'   // Switch to Tasks tab to see progress
      }));
      
      // Clear the parsed file to return to clean state
      if (parseResult) {
        setParseResult(null);
      }

    } catch (error: any) {
      message.error(`Translation failed: ${error.message}`);
    }
  };

  const handleTranslationComplete = async (taskId: string) => {
    try {
      const result = await apiClient.getTaskResult(taskId);
      const translations = result.data.translated_entries;

      // Reconstruct file with translations
      const reconstructed = await fileParser.reconstructFile(
        fileInfo,
        parseResult,
        translations
      );

      // Save file
      const savePath = await window.electronAPI.saveFile({
        fileName: fileInfo.name.replace(/(\.[^.]+)$/, '_translated$1'),
        content: reconstructed
      });

      if (savePath) {
        notification.success({
          message: 'Translation Complete',
          description: `File saved to: ${savePath}`,
          duration: 0
        });
      }

      // Reload token balance
      loadUserInfo();

    } catch (error: any) {
      message.error(`Failed to save file: ${error.message}`);
    } finally {
      setState(prev => ({ 
        ...prev, 
        isProcessing: false, 
        currentTask: null,
        selectedGlossaries: [],
        sourceLanguage: 'en',
        targetLanguage: 'ko'
      }));
      setFileInfo(null);
      setParseResult(null);
    }
  };

  const handleGenerateDynamicGlossary = async () => {
    if (!parseResult || !state.apiKey) return;

    try {
      const response = await apiClient.generateDynamicGlossary(
        parseResult.entries.map((entry: any) => ({ source: entry.source })),
        state.sourceLanguage,
        state.targetLanguage,
        state.selectedGlossaries
      );

      message.success('Dynamic glossary generation started');
      // Could track this task too if needed
    } catch (error: any) {
      message.error(`Failed to generate glossary: ${error.message}`);
    }
  };

  const renderContent = () => {
    // File translation now shows in Tasks tab - no separate progress UI needed

    // Render content based on current tab
    switch (state.currentTab) {
      case 'chatbot':
        return (
          <MinimalChatbotTranslation
            selectedGlossaries={state.selectedGlossaries}
            onSelectedGlossariesChange={(ids) => setState(prev => ({ ...prev, selectedGlossaries: ids }))}
            sourceLanguage={state.sourceLanguage}
            targetLanguage={state.targetLanguage}
            onSourceLanguageChange={(lang) => setState(prev => ({ ...prev, sourceLanguage: lang }))}
            onTargetLanguageChange={(lang) => setState(prev => ({ ...prev, targetLanguage: lang }))}
            apiKey={state.apiKey}
          />
        );

      case 'file-translation':
        return (
          <ProfessionalFileTranslation
            selectedGlossaries={state.selectedGlossaries}
            onSelectedGlossariesChange={(ids) => setState(prev => ({ ...prev, selectedGlossaries: ids }))}
            sourceLanguage={state.sourceLanguage}
            targetLanguage={state.targetLanguage}
            onSourceLanguageChange={(lang) => setState(prev => ({ ...prev, sourceLanguage: lang }))}
            onTargetLanguageChange={(lang) => setState(prev => ({ ...prev, targetLanguage: lang }))}
            apiKey={state.apiKey}
            onStartTranslation={handleStartTranslation}
          />
        );

      case 'glossaries':
        return (
          <ProfessionalGlossaryManager
            apiKey={state.apiKey || ''}
            apiBaseUrl="http://localhost:5002/api/v1"
          />
        );

      case 'tasks':
        return (
          <TasksTab
            apiKey={state.apiKey || ''}
          />
        );

      default:
        return null;
    }
  };

  return (
    <ConfigProvider
      locale={getAntdLocale(i18n.language)}
      theme={{
        algorithm: theme.darkAlgorithm,
        token: {
          colorPrimary: '#8b5cf6',
          colorBgBase: '#0f0f23',
          colorBgContainer: '#16213e',
          colorBgElevated: '#1e2749',
          colorBorder: '#2d3748',
          colorText: '#e2e8f0',
          colorTextSecondary: '#a0aec0',
          borderRadius: 8,
          wireframe: false,
        },
        components: {
          Layout: {
            headerBg: '#0f0f23',
            bodyBg: '#0f0f23',
            siderBg: '#16213e',
          },
          Card: {
            colorBgContainer: '#16213e',
            colorBorderSecondary: '#2d3748',
          },
          Select: {
            colorBgContainer: '#1e2749',
            colorBorder: '#2d3748',
          },
          Input: {
            colorBgContainer: '#1e2749',
            colorBorder: '#2d3748',
          },
          Table: {
            colorBgContainer: '#16213e',
            headerBg: '#1e2749',
          },
          Modal: {
            contentBg: '#16213e',
            headerBg: '#16213e',
          },
        },
      }}
    >
      <AntdApp>
        <Layout className="app-layout">
          <Header 
            tokenBalance={state.tokenBalance}
            onSettingsClick={() => setSettingsVisible(true)}
            onWebsiteClick={() => window.electronAPI.openExternal('https://translateyourgame.com')}
            currentTab={state.currentTab}
            onTabChange={(tab) => setState(prev => ({ ...prev, currentTab: tab }))}
          />
          
          <Content className="app-content">
            {renderContent()}
          </Content>

          <SettingsModal
            visible={settingsVisible}
            apiKey={state.apiKey}
            onClose={() => setSettingsVisible(false)}
            onSave={handleApiKeyUpdate}
          />
          
          <UpdateNotification />
        </Layout>
      </AntdApp>
    </ConfigProvider>
  );
}

export default App;