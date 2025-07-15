import React, { useState, useRef, useEffect } from 'react';
import { Input, Button, Space, Typography, message, Select, Divider } from 'antd';
import { SendOutlined, CopyOutlined, SwapOutlined, DeleteOutlined } from '@ant-design/icons';
import apiClient from '../services/apiClient';

const { TextArea } = Input;
const { Text } = Typography;
const { Option } = Select;

interface MinimalChatbotTranslationProps {
  selectedGlossaries: number[];
  onSelectedGlossariesChange: (ids: number[]) => void;
  sourceLanguage: string;
  targetLanguage: string;
  onSourceLanguageChange: (lang: string) => void;
  onTargetLanguageChange: (lang: string) => void;
  apiKey: string | null;
}

interface TranslationExchange {
  id: string;
  input: string;
  output: string;
  sourceLanguage: string;
  targetLanguage: string;
  timestamp: Date;
  tokensUsed?: number;
  glossaryInfo?: {
    used_glossaries: number[];
    matches_found: number;
    cascade_tier: string;
    confidence_score?: number;
  };
}

const MinimalChatbotTranslation: React.FC<MinimalChatbotTranslationProps> = ({
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
  const [exchanges, setExchanges] = useState<TranslationExchange[]>([]);
  const [glossaries, setGlossaries] = useState<any[]>([]);
  const inputRef = useRef<any>(null);
  const bottomRef = useRef<HTMLDivElement>(null);

  const languages = [
    { code: 'en', name: 'English' },
    { code: 'ko', name: '한국어' },
    { code: 'ja', name: '日本語' },
    { code: 'zh', name: '中文' },
    { code: 'es', name: 'Español' },
    { code: 'fr', name: 'Français' },
    { code: 'de', name: 'Deutsch' },
    { code: 'ru', name: 'Русский' }
  ];

  useEffect(() => {
    loadGlossaries();
  }, []);

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [exchanges]);

  const loadGlossaries = async () => {
    if (!apiKey) return;
    
    try {
      apiClient.setApiKey(apiKey);
      const response = await apiClient.getGlossaries();
      if (response.status === 'success') {
        setGlossaries(response.data.glossaries || []);
      }
    } catch (error) {
      console.error('Failed to load glossaries:', error);
    }
  };

  const handleTranslate = async () => {
    if (!inputText.trim() || !apiKey || isTranslating) return;

    setIsTranslating(true);
    
    try {
      apiClient.setApiKey(apiKey);
      const response = await apiClient.translateSingle({
        text: inputText.trim(),
        source_lang: sourceLanguage,
        target_lang: targetLanguage,
        glossary_ids: selectedGlossaries
      });

      const newExchange: TranslationExchange = {
        id: `${Date.now()}`,
        input: inputText.trim(),
        output: response.data.translation,
        sourceLanguage,
        targetLanguage,
        timestamp: new Date(),
        tokensUsed: response.data.tokens_used,
        glossaryInfo: response.data.glossary_info
      };

      setExchanges(prev => [...prev, newExchange]);
      setInputText('');
      
    } catch (error: any) {
      message.error(`Translation failed: ${error.message}`);
    } finally {
      setIsTranslating(false);
      inputRef.current?.focus();
    }
  };

  const handleKeyPress = (e: React.KeyboardEvent) => {
    // Ctrl+Enter or Cmd+Enter to submit multi-line text
    if (e.key === 'Enter' && (e.ctrlKey || e.metaKey)) {
      e.preventDefault();
      handleTranslate();
    }
  };

  const copyToClipboard = (text: string) => {
    navigator.clipboard.writeText(text);
    message.success('Copied');
  };

  const getGlossaryName = (id: number) => {
    return glossaries.find(g => g.id === id)?.name || `Glossary ${id}`;
  };

  const formatCascadeTier = (tier: string) => {
    const tierMap: { [key: string]: string } = {
      'exact_match': 'Tier 1: Exact Match',
      'embedding_similarity': 'Tier 2: Embedding Similarity',
      'fuzzy_match': 'Tier 3: Fuzzy Match', 
      'dynamic_context': 'Tier 4: Dynamic Context',
      'ai_inference': 'Tier 5: AI Inference'
    };
    return tierMap[tier] || tier;
  };

  return (
    <div style={{ 
      height: '100vh', 
      display: 'flex', 
      flexDirection: 'column',
      background: '#0a0a0a',
      color: '#e2e8f0'
    }}>
      
      {/* Minimal Header */}
      <div style={{ 
        padding: '16px 24px', 
        borderBottom: '1px solid #333',
        background: '#111'
      }}>
        <Space size="middle">
          <Select
            value={sourceLanguage}
            onChange={onSourceLanguageChange}
            style={{ width: 120 }}
            size="small"
          >
            {languages.map(lang => (
              <Option key={lang.code} value={lang.code}>{lang.name}</Option>
            ))}
          </Select>
          
          <Button 
            type="text" 
            icon={<SwapOutlined />} 
            size="small"
            onClick={() => {
              const temp = sourceLanguage;
              onSourceLanguageChange(targetLanguage);
              onTargetLanguageChange(temp);
            }}
          />
          
          <Select
            value={targetLanguage}
            onChange={onTargetLanguageChange}
            style={{ width: 120 }}
            size="small"
          >
            {languages.map(lang => (
              <Option key={lang.code} value={lang.code}>{lang.name}</Option>
            ))}
          </Select>

          <Select
            mode="multiple"
            placeholder="Glossaries"
            value={selectedGlossaries}
            onChange={onSelectedGlossariesChange}
            style={{ minWidth: 150 }}
            size="small"
          >
            {glossaries.map(glossary => (
              <Option key={glossary.id} value={glossary.id}>
                {glossary.name}
              </Option>
            ))}
          </Select>

          <Button 
            type="text" 
            icon={<DeleteOutlined />} 
            onClick={() => setExchanges([])}
            size="small"
            disabled={exchanges.length === 0}
          >
            Clear
          </Button>
        </Space>
      </div>

      {/* Translation History - Claude Style */}
      <div style={{ 
        flex: 1, 
        overflow: 'auto', 
        padding: '24px',
        background: '#0a0a0a'
      }}>
        {exchanges.length === 0 && (
          <div style={{ 
            textAlign: 'center', 
            color: '#666', 
            marginTop: '100px',
            fontSize: '16px'
          }}>
            Enter text to translate
          </div>
        )}

        {exchanges.map((exchange, index) => (
          <div key={exchange.id} style={{ marginBottom: '32px' }}>
            
            {/* User Input */}
            <div style={{ marginBottom: '8px' }}>
              <div style={{ 
                background: '#1a1a1a', 
                padding: '16px', 
                borderRadius: '8px',
                border: '1px solid #333'
              }}>
                <div style={{ fontSize: '14px', color: '#888', marginBottom: '8px' }}>
                  {sourceLanguage.toUpperCase()}
                </div>
                <div style={{ fontSize: '16px', lineHeight: '1.5', whiteSpace: 'pre-wrap' }}>
                  {exchange.input}
                </div>
              </div>
            </div>

            {/* Translation Output */}
            <div style={{ marginBottom: '8px' }}>
              <div style={{ 
                background: '#0f1419', 
                padding: '16px', 
                borderRadius: '8px',
                border: '1px solid #2d3748'
              }}>
                <div style={{ 
                  display: 'flex', 
                  justifyContent: 'space-between', 
                  alignItems: 'center',
                  marginBottom: '8px'
                }}>
                  <div style={{ fontSize: '14px', color: '#888' }}>
                    {targetLanguage.toUpperCase()}
                  </div>
                  <Button 
                    type="text" 
                    size="small"
                    icon={<CopyOutlined />}
                    onClick={() => copyToClipboard(exchange.output)}
                  />
                </div>
                <div style={{ fontSize: '16px', lineHeight: '1.5', whiteSpace: 'pre-wrap' }}>
                  {exchange.output}
                </div>
              </div>
            </div>

            {/* Glossary Information - Technical Details */}
            {exchange.glossaryInfo && (
              <div style={{ 
                background: '#0d1117', 
                padding: '12px', 
                borderRadius: '6px',
                border: '1px solid #21262d',
                fontSize: '13px',
                color: '#8b949e'
              }}>
                <div style={{ display: 'flex', flexWrap: 'wrap', gap: '16px' }}>
                  <div>
                    <strong>Cascade:</strong> {formatCascadeTier(exchange.glossaryInfo.cascade_tier)}
                  </div>
                  <div>
                    <strong>Matches:</strong> {exchange.glossaryInfo.matches_found}
                  </div>
                  {exchange.glossaryInfo.confidence_score && (
                    <div>
                      <strong>Confidence:</strong> {(exchange.glossaryInfo.confidence_score * 100).toFixed(1)}%
                    </div>
                  )}
                  <div>
                    <strong>Tokens:</strong> {exchange.tokensUsed}
                  </div>
                </div>
                {exchange.glossaryInfo.used_glossaries.length > 0 && (
                  <div style={{ marginTop: '8px' }}>
                    <strong>Glossaries:</strong>{' '}
                    {exchange.glossaryInfo.used_glossaries.map(id => getGlossaryName(id)).join(', ')}
                  </div>
                )}
              </div>
            )}

            {index < exchanges.length - 1 && (
              <Divider style={{ borderColor: '#333', margin: '24px 0' }} />
            )}
          </div>
        ))}
        <div ref={bottomRef} />
      </div>

      {/* Input Area */}
      <div style={{ 
        padding: '16px 24px', 
        borderTop: '1px solid #333',
        background: '#111'
      }}>
        <div style={{ display: 'flex', gap: '12px', alignItems: 'flex-end' }}>
          <TextArea
            ref={inputRef}
            value={inputText}
            onChange={(e) => setInputText(e.target.value)}
            onKeyPress={handleKeyPress}
            placeholder="Enter text to translate..."
            style={{
              background: '#1a1a1a',
              border: '1px solid #333',
              color: '#e2e8f0',
              resize: 'none'
            }}
            autoSize={{ minRows: 1, maxRows: 4 }}
            disabled={!apiKey || isTranslating}
          />
          <Button
            type="primary"
            icon={<SendOutlined />}
            onClick={handleTranslate}
            loading={isTranslating}
            disabled={!inputText.trim() || !apiKey}
            style={{ 
              background: '#8b5cf6',
              borderColor: '#8b5cf6',
              height: '32px'
            }}
          />
        </div>
      </div>
    </div>
  );
};

export default MinimalChatbotTranslation;