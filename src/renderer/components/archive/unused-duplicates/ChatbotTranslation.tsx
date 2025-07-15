import React, { useState, useRef, useEffect } from 'react';
import { Input, Button, Space, Typography, message, Popover, Tag, Avatar, Tooltip } from 'antd';
import { SendOutlined, CopyOutlined, SettingOutlined, TranslationOutlined, SwapOutlined, BookOutlined, UserOutlined, RobotOutlined } from '@ant-design/icons';
import apiClient from '../services/apiClient';
import LanguageSelector from './LanguageSelector';
import GlossarySelector from './GlossarySelector';

const { TextArea } = Input;
const { Text } = Typography;

interface ChatbotTranslationProps {
  selectedGlossaries: number[];
  onSelectedGlossariesChange: (ids: number[]) => void;
  sourceLanguage: string;
  targetLanguage: string;
  onSourceLanguageChange: (lang: string) => void;
  onTargetLanguageChange: (lang: string) => void;
  apiKey: string | null;
}

interface ChatMessage {
  id: string;
  type: 'user' | 'assistant';
  content: string;
  sourceLanguage?: string;
  targetLanguage?: string;
  timestamp: Date;
  tokensUsed?: number;
  isTyping?: boolean;
}

const ChatbotTranslation: React.FC<ChatbotTranslationProps> = ({
  selectedGlossaries,
  onSelectedGlossariesChange,
  sourceLanguage,
  targetLanguage,
  onSourceLanguageChange,
  onTargetLanguageChange,
  apiKey
}) => {
  const [inputText, setInputText] = useState('');
  const [isTranslating, setIsTranslating] = useState(false);
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [settingsVisible, setSettingsVisible] = useState(false);
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<any>(null);

  const languages = [
    { code: 'en', name: 'English' },
    { code: 'ko', name: '한국어 (Korean)' },
    { code: 'ja', name: '日本語 (Japanese)' },
    { code: 'fr', name: 'Français (French)' },
    { code: 'es', name: 'Español (Spanish)' },
    { code: 'de', name: 'Deutsch (German)' },
    { code: 'it', name: 'Italiano (Italian)' },
    { code: 'pt', name: 'Português (Portuguese)' },
    { code: 'ru', name: 'Русский (Russian)' },
    { code: 'zh', name: '中文 (Chinese)' }
  ];

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  };

  useEffect(() => {
    scrollToBottom();
  }, [messages]);

  const handleTranslate = async () => {
    if (!inputText.trim() || !apiKey) {
      message.warning('Please enter text to translate');
      return;
    }

    const userMessage: ChatMessage = {
      id: Date.now().toString(),
      type: 'user',
      content: inputText.trim(),
      sourceLanguage,
      targetLanguage,
      timestamp: new Date()
    };

    const typingMessage: ChatMessage = {
      id: `${Date.now()}_typing`,
      type: 'assistant',
      content: 'Translating...',
      timestamp: new Date(),
      isTyping: true
    };

    setMessages(prev => [...prev, userMessage, typingMessage]);
    setInputText('');
    setIsTranslating(true);

    try {
      const response = await apiClient.translateSingle({
        text: inputText.trim(),
        source_lang: sourceLanguage,
        target_lang: targetLanguage,
        glossary_ids: selectedGlossaries
      });

      const assistantMessage: ChatMessage = {
        id: `${Date.now()}_response`,
        type: 'assistant',
        content: response.data.translation,
        sourceLanguage,
        targetLanguage,
        timestamp: new Date(),
        tokensUsed: response.data.tokens_used
      };

      setMessages(prev => prev.filter(m => !m.isTyping).concat([assistantMessage]));
      message.success(`Translation completed (${response.data.tokens_used} tokens used)`);
    } catch (error: any) {
      setMessages(prev => prev.filter(m => !m.isTyping));
      message.error(`Translation failed: ${error.message}`);
    } finally {
      setIsTranslating(false);
      inputRef.current?.focus();
    }
  };

  const handleCopyMessage = (content: string) => {
    navigator.clipboard.writeText(content);
    message.success('Copied to clipboard');
  };

  const handleClearChat = () => {
    setMessages([]);
    message.success('Chat cleared');
  };

  const handleKeyPress = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleTranslate();
    }
  };

  const getLanguageName = (code: string) => {
    return languages.find(lang => lang.code === code)?.name || code.toUpperCase();
  };

  const renderSettingsDropdown = () => (
    <div style={{ background: '#16213e', padding: '12px', borderRadius: '8px', minWidth: '300px' }}>
      <div style={{ marginBottom: '16px' }}>
        <Text strong style={{ display: 'block', marginBottom: 8, color: '#e2e8f0' }}>Languages</Text>
        <Space direction="vertical" style={{ width: '100%' }}>
          <div>
            <Text style={{ fontSize: '12px', color: '#a0aec0' }}>Source:</Text>
            <div style={{ marginTop: 4 }}>
              <LanguageSelector
                value={sourceLanguage}
                onChange={onSourceLanguageChange}
                languages={languages}
                placeholder="Select source"
              />
            </div>
          </div>
          <div>
            <Text style={{ fontSize: '12px', color: '#a0aec0' }}>Target:</Text>
            <div style={{ marginTop: 4 }}>
              <LanguageSelector
                value={targetLanguage}
                onChange={onTargetLanguageChange}
                languages={languages}
                placeholder="Select target"
              />
            </div>
          </div>
          <Button
            type="link"
            icon={<SwapOutlined />}
            onClick={() => {
              const temp = sourceLanguage;
              onSourceLanguageChange(targetLanguage);
              onTargetLanguageChange(temp);
            }}
            style={{ padding: 0, height: 'auto', color: '#8b5cf6' }}
          >
            Swap Languages
          </Button>
        </Space>
      </div>
      
      <div style={{ marginBottom: '16px' }}>
        <GlossarySelector
          selectedGlossaries={selectedGlossaries}
          onGlossariesChange={onSelectedGlossariesChange}
          sourceLanguage={sourceLanguage}
          targetLanguage={targetLanguage}
          onSourceLanguageChange={onSourceLanguageChange}
          onTargetLanguageChange={onTargetLanguageChange}
          onStartTranslation={() => {}}
          onGenerateGlossary={() => {}}
          apiKey={apiKey}
          hideLanguageSelector={true}
          hideButtons={true}
        />
      </div>
      
      <Button
        type="text"
        onClick={handleClearChat}
        style={{ color: '#e2e8f0', width: '100%', textAlign: 'left' }}
      >
        Clear Chat
      </Button>
    </div>
  );

  return (
    <div style={{ 
      height: 'calc(100vh - 80px)', 
      display: 'flex', 
      flexDirection: 'column',
      background: '#0f0f23',
      position: 'relative'
    }}>
      {/* Chat Header */}
      <div style={{
        padding: '12px 24px',
        borderBottom: '1px solid #2d3748',
        background: '#16213e',
        display: 'flex',
        justifyContent: 'space-between',
        alignItems: 'center',
        flexShrink: 0
      }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
          <TranslationOutlined style={{ color: '#8b5cf6', fontSize: '20px' }} />
          <div>
            <Text strong style={{ color: '#e2e8f0', fontSize: '16px' }}>Translation Chat</Text>
            <div style={{ fontSize: '12px', color: '#a0aec0', marginTop: '2px' }}>
              {getLanguageName(sourceLanguage)} → {getLanguageName(targetLanguage)}
              {selectedGlossaries.length > 0 && (
                <Tag color="purple" style={{ marginLeft: 8, fontSize: '10px' }}>
                  {selectedGlossaries.length} active
                </Tag>
              )}
            </div>
          </div>
        </div>
        
        <Popover
          content={renderSettingsDropdown()} 
          trigger="click"
          placement="bottomRight"
          overlayStyle={{ zIndex: 1050 }}
        >
          <Button 
            type="text" 
            icon={<SettingOutlined />} 
            style={{ color: '#a0aec0' }}
          />
        </Popover>
      </div>

      {/* Chat Messages Area */}
      <div style={{
        flex: 1,
        overflowY: 'auto',
        padding: '20px',
        display: 'flex',
        flexDirection: 'column',
        gap: '16px'
      }}>
        {messages.length === 0 ? (
          <div style={{
            flex: 1,
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            flexDirection: 'column',
            color: '#a0aec0',
            textAlign: 'center'
          }}>
            <RobotOutlined style={{ fontSize: '48px', marginBottom: '16px', color: '#8b5cf6' }} />
            <Text style={{ color: '#a0aec0', fontSize: '16px' }}>Welcome to Translation Chat!</Text>
            <Text style={{ color: '#718096', fontSize: '14px', marginTop: '8px' }}>
              Type your text below and I'll translate it for you
            </Text>
          </div>
        ) : (
          messages.map((msg) => (
            <div
              key={msg.id}
              style={{
                display: 'flex',
                justifyContent: msg.type === 'user' ? 'flex-end' : 'flex-start',
                alignItems: 'flex-start',
                gap: '12px',
                maxWidth: '100%'
              }}
            >
              {msg.type === 'assistant' && (
                <Avatar 
                  icon={<RobotOutlined />} 
                  style={{ 
                    backgroundColor: '#8b5cf6',
                    flexShrink: 0
                  }} 
                />
              )}
              
              <div style={{
                maxWidth: '70%',
                display: 'flex',
                flexDirection: 'column',
                alignItems: msg.type === 'user' ? 'flex-end' : 'flex-start'
              }}>
                <div style={{
                  background: msg.type === 'user' ? '#8b5cf6' : '#1e2749',
                  color: msg.type === 'user' ? '#ffffff' : '#e2e8f0',
                  padding: '12px 16px',
                  borderRadius: '16px',
                  borderBottomRightRadius: msg.type === 'user' ? '4px' : '16px',
                  borderBottomLeftRadius: msg.type === 'assistant' ? '4px' : '16px',
                  position: 'relative',
                  wordBreak: 'break-word',
                  ...(msg.isTyping && {
                    background: '#1e2749',
                    border: '1px solid #2d3748'
                  })
                }}>
                  {msg.isTyping ? (
                    <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                      <div className="typing-dots">
                        <span></span>
                        <span></span>
                        <span></span>
                      </div>
                      <Text style={{ color: '#a0aec0', fontSize: '12px' }}>Translating...</Text>
                    </div>
                  ) : (
                    <Text style={{ color: 'inherit', whiteSpace: 'pre-wrap' }}>
                      {msg.content}
                    </Text>
                  )}
                  
                  {!msg.isTyping && (
                    <Tooltip title="Copy message">
                      <Button
                        type="text"
                        size="small"
                        icon={<CopyOutlined />}
                        onClick={() => handleCopyMessage(msg.content)}
                        style={{
                          position: 'absolute',
                          top: '4px',
                          right: '4px',
                          color: msg.type === 'user' ? 'rgba(255,255,255,0.7)' : '#a0aec0',
                          opacity: 0,
                          transition: 'opacity 0.2s'
                        }}
                        className="message-copy-btn"
                      />
                    </Tooltip>
                  )}
                </div>
                
                <div style={{
                  fontSize: '11px',
                  color: '#718096',
                  marginTop: '4px',
                  display: 'flex',
                  alignItems: 'center',
                  gap: '8px'
                }}>
                  <span>{msg.timestamp.toLocaleTimeString()}</span>
                  {msg.tokensUsed && (
                    <span>• {msg.tokensUsed} tokens</span>
                  )}
                  {msg.type === 'user' && msg.sourceLanguage && (
                    <span>• {getLanguageName(msg.sourceLanguage)}</span>
                  )}
                </div>
              </div>

              {msg.type === 'user' && (
                <Avatar 
                  icon={<UserOutlined />} 
                  style={{ 
                    backgroundColor: '#4a5568',
                    flexShrink: 0
                  }} 
                />
              )}
            </div>
          ))
        )}
        <div ref={messagesEndRef} />
      </div>

      {/* Chat Input */}
      <div style={{
        padding: '20px',
        borderTop: '1px solid #2d3748',
        background: '#16213e',
        flexShrink: 0
      }}>
        <div style={{
          display: 'flex',
          gap: '12px',
          alignItems: 'flex-end',
          maxWidth: '100%'
        }}>
          <div style={{ flex: 1 }}>
            <TextArea
              ref={inputRef}
              value={inputText}
              onChange={(e) => setInputText(e.target.value)}
              onKeyDown={handleKeyPress}
              placeholder="Type your message... (Enter to send, Shift+Enter for new line)"
              autoSize={{ minRows: 1, maxRows: 4 }}
              style={{
                background: '#1e2749',
                border: '1px solid #2d3748',
                borderRadius: '12px',
                resize: 'none'
              }}
              maxLength={1000}
            />
            <div style={{
              display: 'flex',
              justifyContent: 'space-between',
              alignItems: 'center',
              marginTop: '8px'
            }}>
              <Text style={{ fontSize: '11px', color: '#718096' }}>
                {inputText.length}/1000 characters
              </Text>
            </div>
          </div>
          
          <Button
            type="primary"
            icon={<SendOutlined />}
            onClick={handleTranslate}
            loading={isTranslating}
            disabled={!inputText.trim() || !apiKey}
            style={{
              background: '#8b5cf6',
              borderColor: '#8b5cf6',
              borderRadius: '12px',
              height: '40px',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center'
            }}
          >
            Send
          </Button>
        </div>
      </div>

      <style>{`
        .message-copy-btn {
          transition: opacity 0.2s ease;
        }
        
        .message-copy-btn:hover {
          opacity: 1 !important;
        }
        
        div:hover .message-copy-btn {
          opacity: 1 !important;
        }
        
        .typing-dots {
          display: flex;
          gap: 4px;
        }
        
        .typing-dots span {
          height: 6px;
          width: 6px;
          background-color: #8b5cf6;
          border-radius: 50%;
          animation: typing-pulse 1.4s ease-in-out infinite both;
        }
        
        .typing-dots span:nth-child(1) { animation-delay: -0.32s; }
        .typing-dots span:nth-child(2) { animation-delay: -0.16s; }
        
        @keyframes typing-pulse {
          0%, 80%, 100% {
            transform: scale(0.8);
            opacity: 0.5;
          }
          40% {
            transform: scale(1);
            opacity: 1;
          }
        }
      `}</style>
    </div>
  );
};

export default ChatbotTranslation;