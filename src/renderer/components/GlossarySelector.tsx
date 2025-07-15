import React, { useState, useEffect } from 'react';
import { Card, Select, Button, Space, Typography, Row, Col, message } from 'antd';
import { TranslationOutlined, BookOutlined, PlayCircleOutlined, PlusOutlined } from '@ant-design/icons';
import apiClient from '../services/apiClient';

const { Title, Text } = Typography;
const { Option } = Select;

interface GlossarySelectorProps {
  selectedGlossaries: number[];
  onGlossariesChange: (ids: number[]) => void;
  sourceLanguage: string;
  targetLanguage: string;
  onSourceLanguageChange: (lang: string) => void;
  onTargetLanguageChange: (lang: string) => void;
  onStartTranslation: () => void;
  onGenerateGlossary: () => void;
  apiKey: string | null;
  hideLanguageSelector?: boolean;
  hideButtons?: boolean;
}

const GlossarySelector: React.FC<GlossarySelectorProps> = ({
  selectedGlossaries,
  onGlossariesChange,
  sourceLanguage,
  targetLanguage,
  onSourceLanguageChange,
  onTargetLanguageChange,
  onStartTranslation,
  onGenerateGlossary,
  apiKey,
  hideLanguageSelector = false,
  hideButtons = false
}) => {
  const [glossaries, setGlossaries] = useState<any[]>([]);
  const [languages, setLanguages] = useState<any[]>([]);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    // Load data with apiKey or use demo mode for localhost
    if (apiKey || window.location.hostname === 'localhost') {
      loadData();
    }
  }, [apiKey]);

  const loadData = async () => {
    setLoading(true);
    try {
      // Set API key if provided
      if (apiKey) {
        apiClient.setApiKey(apiKey);
      } else {
        // No API key available
        setLoading(false);
        return;
      }
      
      const [glossariesRes, languagesRes] = await Promise.all([
        apiClient.getGlossaries(),
        apiClient.getLanguages()
      ]);
      
      const glossariesData = glossariesRes?.data?.glossaries || [];
      const languagesData = languagesRes?.data || [];
      
      // Ensure arrays
      setGlossaries(Array.isArray(glossariesData) ? glossariesData : []);
      setLanguages(Array.isArray(languagesData) ? languagesData : []);
    } catch (error: any) {
      console.error('Failed to load glossaries/languages:', error);
      message.error(`Failed to load data: ${error.message}`);
      // Ensure we set empty arrays on error
      setGlossaries([]);
      setLanguages([]);
    } finally {
      setLoading(false);
    }
  };

  const getLanguageName = (code: string) => {
    const lang = languages.find(l => l.code === code);
    return lang ? `${lang.name} (${code})` : code;
  };

  const commonLanguages = [
    { code: 'en', name: 'English' },
    { code: 'ko', name: 'Korean' },
    { code: 'ja', name: 'Japanese' },
    { code: 'zh', name: 'Chinese' },
    { code: 'fr', name: 'French' },
    { code: 'de', name: 'German' },
    { code: 'es', name: 'Spanish' },
    { code: 'it', name: 'Italian' },
    { code: 'pt', name: 'Portuguese' },
    { code: 'ru', name: 'Russian' }
  ];

  const content = (
    <Space direction="vertical" size={24} style={{ width: '100%' }}>
        {!hideLanguageSelector && (
          <Row gutter={24}>
            <Col span={12}>
              <div>
                <Text strong style={{ display: 'block', marginBottom: 8 }}>
                  Source Language:
                </Text>
                <Select
                  value={sourceLanguage}
                  onChange={onSourceLanguageChange}
                  style={{ width: '100%' }}
                  size="large"
                  placeholder="Select source language"
                >
                  {commonLanguages.map(lang => (
                    <Option key={lang.code} value={lang.code}>
                      {lang.name} ({lang.code})
                    </Option>
                  ))}
                </Select>
              </div>
            </Col>
            <Col span={12}>
              <div>
                <Text strong style={{ display: 'block', marginBottom: 8 }}>
                  Target Language:
                </Text>
                <Select
                  value={targetLanguage}
                  onChange={onTargetLanguageChange}
                  style={{ width: '100%' }}
                  size="large"
                  placeholder="Select target language"
                >
                  {commonLanguages.map(lang => (
                    <Option key={lang.code} value={lang.code}>
                      {lang.name} ({lang.code})
                    </Option>
                  ))}
                </Select>
              </div>
            </Col>
          </Row>
        )}

        <div>
          <Text strong style={{ display: 'block', marginBottom: 8, color: '#e2e8f0' }}>
            Glossaries:
          </Text>
          <Select
            mode="multiple"
            value={selectedGlossaries}
            onChange={onGlossariesChange}
            style={{ width: '100%' }}
            size="large"
            placeholder="Select glossaries"
            loading={loading}
            showSearch={false}
          >
            {Array.isArray(glossaries) ? glossaries.map(glossary => (
              <Option key={glossary.id} value={glossary.id}>
                {glossary.name} ({glossary.source_language} → {glossary.target_language}) - {glossary.entry_count} entries
              </Option>
            )) : []}
          </Select>
        </div>

        {!hideButtons && (
          <Row gutter={16}>
            <Col span={12}>
              <Button
                type="default"
                size="large"
                icon={<PlusOutlined />}
                onClick={onGenerateGlossary}
                block
                disabled={!sourceLanguage || !targetLanguage}
              >
                Generate Glossary
              </Button>
            </Col>
            <Col span={12}>
              <Button
                type="primary"
                size="large"
                icon={<PlayCircleOutlined />}
                onClick={onStartTranslation}
                block
                disabled={!sourceLanguage || !targetLanguage}
              >
                Start Translation
              </Button>
            </Col>
          </Row>
        )}

      </Space>
  );

  if (hideButtons) {
    return content;
  }

  return (
    <Card title="Translation Settings" style={{ marginTop: 24 }}>
      {content}
    </Card>
  );
};

export default GlossarySelector;