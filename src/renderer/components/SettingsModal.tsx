import React, { useState, useEffect } from 'react';
import { Modal, Form, Input, Button, Typography, Space, Alert, Tabs, message, Select, Card, Tag, Row, Col } from 'antd';
import { KeyOutlined, GlobalOutlined, UserOutlined, TranslationOutlined, RobotOutlined, ThunderboltOutlined, DollarOutlined, TrophyOutlined } from '@ant-design/icons';
import { useTranslation } from 'react-i18next';
import apiClient from '../services/apiClient';
import { SUPPORTED_LANGUAGES, SupportedLanguage } from '../i18n/types';

const { Text, Paragraph, Title } = Typography;
const { TabPane } = Tabs;

interface SettingsModalProps {
  visible: boolean;
  apiKey: string | null;
  onClose: () => void;
  onSave: (apiKey: string) => void;
}

interface ModelInfo {
  name: string;
  display_name: string;
  quality: string;
  speed: string;
  cost: string;
}

interface ModelsResponse {
  providers: {
    claude: {
      name: string;
      models: Record<string, ModelInfo>;
    };
    qwen: {
      name: string;
      models: Record<string, ModelInfo>;
    };
  };
  defaults: {
    claude: string;
    qwen: string;
  };
}


const SettingsModal: React.FC<SettingsModalProps> = ({
  visible,
  apiKey,
  onClose,
  onSave
}) => {
  const { t, i18n } = useTranslation(['settings', 'common']);
  const [apiForm] = Form.useForm();
  const [loading, setLoading] = useState(false);
  const [activeTab, setActiveTab] = useState('api');
  const [models, setModels] = useState<ModelsResponse | null>(null);
  const [selectedProvider, setSelectedProvider] = useState<'claude' | 'qwen'>('qwen');
  const [selectedModel, setSelectedModel] = useState<string>('');
  const [modelsLoading, setModelsLoading] = useState(false);

  // Update form when API key changes or modal opens
  useEffect(() => {
    if (visible) {
      apiForm.setFieldsValue({ apiKey });
      loadModels();
    }
  }, [visible, apiKey, apiForm]);

  const loadModels = async () => {
    console.log('loadModels called with apiKey:', apiKey);
    if (!apiKey) {
      console.log('No API key available, skipping model loading');
      return;
    }
    
    // Check if this is first-time loading
    const hasLoadedBefore = localStorage.getItem('modelsLoadedBefore') === 'true';
    
    setModelsLoading(true);
    
    // Show notification for first-time loading
    if (!hasLoadedBefore) {
      message.info({
        content: 'Loading AI models for the first time... This might take a moment.',
        duration: 4,
        style: {
          marginTop: '10vh',
        }
      });
    }
    
    try {
      // Set the API key in the client before making the request
      apiClient.setApiKey(apiKey);
      console.log('API key set, making request to /models');
      const response = await apiClient.get('/models');
      console.log('Models API response:', response);
      if (response.status === 'success') {
        setModels(response.data);
        console.log('Models loaded successfully:', response.data);
        
        // Mark that models have been loaded before
        localStorage.setItem('modelsLoadedBefore', 'true');
        
        // Load saved preferences from localStorage
        const savedProvider = localStorage.getItem('selectedProvider') as 'claude' | 'qwen' || 'qwen';
        const savedModel = localStorage.getItem('selectedModel') || '';
        
        setSelectedProvider(savedProvider);
        setSelectedModel(savedModel || response.data.defaults[savedProvider]);
        
        // Success message for first-time users
        if (!hasLoadedBefore) {
          message.success({
            content: 'AI models loaded successfully! You can now select your preferred model.',
            duration: 3,
            style: {
              marginTop: '10vh',
            }
          });
        }
      } else {
        console.error('Models API returned error:', response);
        message.error('Failed to load AI models. Please check your API key.');
      }
    } catch (error) {
      console.error('Failed to load models:', error);
      message.error('Failed to load AI models. Please check your connection and API key.');
    } finally {
      setModelsLoading(false);
    }
  };

  const handleProviderChange = (provider: 'claude' | 'qwen') => {
    setSelectedProvider(provider);
    const defaultModel = models?.defaults[provider] || '';
    setSelectedModel(defaultModel);
  };

  const handleModelChange = (modelKey: string) => {
    setSelectedModel(modelKey);
  };

  const saveModelSettings = () => {
    localStorage.setItem('selectedProvider', selectedProvider);
    localStorage.setItem('selectedModel', selectedModel);
    message.success('Model settings saved successfully');
    
    // Dispatch custom event to notify other components
    window.dispatchEvent(new CustomEvent('modelSettingsChanged'));
  };

  const getQualityColor = (quality: string) => {
    switch (quality.toLowerCase()) {
      case 'maximum': return '#ff4d4f';
      case 'highest': return '#722ed1';
      case 'higher': return '#1890ff';
      case 'high': return '#52c41a';
      case 'better': return '#faad14';
      case 'good': return '#13c2c2';
      default: return '#8c8c8c';
    }
  };

  const getSpeedColor = (speed: string) => {
    switch (speed.toLowerCase()) {
      case 'very fast': return '#52c41a';
      case 'fast': return '#1890ff';
      case 'moderate': return '#faad14';
      case 'slower': return '#fa8c16';
      case 'slowest': return '#ff4d4f';
      default: return '#8c8c8c';
    }
  };

  const getCostColor = (cost: string) => {
    switch (cost.toLowerCase()) {
      case 'budget': return '#52c41a';
      case 'affordable': return '#13c2c2';
      case 'low': return '#1890ff';
      case 'moderate': return '#faad14';
      case 'premium': return '#fa8c16';
      case 'premium+': return '#ff4d4f';
      case 'expensive': return '#ff4d4f';
      default: return '#8c8c8c';
    }
  };

  const renderModelCard = (modelKey: string, model: ModelInfo, isSelected: boolean) => (
    <Card
      key={modelKey}
      size="small"
      className={isSelected ? 'selected-model' : ''}
      hoverable
      style={{
        cursor: 'pointer',
        marginBottom: 12,
        border: isSelected ? '3px solid #52c41a' : '1px solid #d9d9d9',
        backgroundColor: isSelected ? '#f6ffed' : undefined,
        boxShadow: isSelected ? '0 4px 8px rgba(82, 196, 26, 0.3)' : undefined
      }}
      onClick={() => handleModelChange(modelKey)}
    >
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
        <div style={{ flex: 1 }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 4 }}>
            <Text strong style={{ fontSize: 14 }}>
              {model.display_name}
            </Text>
            {isSelected && (
              <div style={{
                backgroundColor: '#52c41a',
                color: 'white',
                padding: '2px 8px',
                borderRadius: 12,
                fontSize: 10,
                fontWeight: 'bold'
              }}>
                ACTIVE
              </div>
            )}
          </div>
          <Text type="secondary" style={{ fontSize: 12, display: 'block', marginBottom: 8 }}>
            {model.name}
          </Text>
        </div>
      </div>
      
      <Row gutter={8}>
        <Col span={8}>
          <Tag color={getQualityColor(model.quality)} icon={<TrophyOutlined />}>
            {model.quality}
          </Tag>
        </Col>
        <Col span={8}>
          <Tag color={getSpeedColor(model.speed)} icon={<ThunderboltOutlined />}>
            {model.speed}
          </Tag>
        </Col>
        <Col span={8}>
          <Tag color={getCostColor(model.cost)} icon={<DollarOutlined />}>
            {model.cost}
          </Tag>
        </Col>
      </Row>
    </Card>
  );

  const handleApiKeySubmit = async (values: { apiKey: string }) => {
    setLoading(true);
    try {
      await onSave(values.apiKey);
      message.success('API key saved successfully');
      // Form will be closed by parent component after successful save
    } catch (error) {
      message.error('Failed to save API key');
    } finally {
      setLoading(false);
    }
  };


  const handleGetApiKey = () => {
    window.electronAPI.openExternal('https://translateyourgame.com/my-profile');
  };

  const handleLanguageChange = async (language: SupportedLanguage) => {
    try {
      await i18n.changeLanguage(language);
      message.success(t('settings:language.change_success'));
    } catch (error) {
      message.error(t('settings:language.change_error'));
    }
  };

  return (
    <Modal
      title={
        <Space>
          <UserOutlined />
          {t('settings:title')}
        </Space>
      }
      open={visible}
      onCancel={onClose}
      footer={null}
      width={800}
    >
      <Tabs activeKey={activeTab} onChange={setActiveTab}>
        <TabPane 
          tab={
            <Space>
              <KeyOutlined />
              {t('settings:tabs.api_key')}
            </Space>
          } 
          key="api"
        >
          <div style={{ padding: '16px 0' }}>
            <Alert
              message={apiKey ? t('settings:api_key.alert_title_set') : t('settings:api_key.alert_title_required')}
              description={apiKey ? 
                t('settings:api_key.alert_desc_set') :
                t('settings:api_key.alert_desc_required')
              }
              type={apiKey ? "success" : "info"}
              showIcon
              style={{ marginBottom: 24 }}
            />

            <Form
              form={apiForm}
              layout="vertical"
              onFinish={handleApiKeySubmit}
              initialValues={{ apiKey }}
            >
              <Form.Item
                label={t('settings:api_key.label')}
                name="apiKey"
                rules={[
                  { required: true, message: t('settings:api_key.validation_required') },
                  { pattern: /^tk_live_/, message: t('settings:api_key.validation_format') }
                ]}
              >
                <Input.Password
                  placeholder={t('settings:api_key.placeholder')}
                  size="large"
                  prefix={<KeyOutlined />}
                />
              </Form.Item>

              <Space direction="vertical" size={16} style={{ width: '100%' }}>
                <div>
                  <Paragraph type="secondary">
                    {t('settings:api_key.no_key_text')}
                  </Paragraph>
                  <Button 
                    icon={<GlobalOutlined />}
                    onClick={handleGetApiKey}
                    type="link"
                    style={{ padding: 0 }}
                  >
                    {t('settings:api_key.get_key_button')}
                  </Button>
                </div>

                <div style={{ display: 'flex', justifyContent: 'flex-end', gap: 8 }}>
                  <Button onClick={onClose}>
                    {t('common:buttons.cancel')}
                  </Button>
                  <Button 
                    type="primary" 
                    htmlType="submit"
                    loading={loading}
                  >
                    {t('settings:api_key.save_button')}
                  </Button>
                </div>
              </Space>
            </Form>

            <div style={{ marginTop: 24, padding: 16, backgroundColor: '#1f2937', borderRadius: 6 }}>
              <Text strong style={{ color: '#10b981' }}>{t('settings:api_key.security_title')}</Text>
              <Paragraph style={{ margin: '8px 0 0 0', fontSize: 13, color: '#e5e7eb' }}>
                {t('settings:api_key.security_desc')}
              </Paragraph>
            </div>
          </div>
        </TabPane>

        <TabPane 
          tab={
            <Space>
              <UserOutlined />
              {t('settings:tabs.profile')}
            </Space>
          } 
          key="profile"
        >
          <div style={{ padding: '16px 0' }}>
            <div style={{ textAlign: 'center', padding: 40 }}>
              <Title level={3}>{t('settings:profile.title')}</Title>
              <Paragraph style={{ marginBottom: 24, fontSize: 15, color: '#8c8c8c' }}>
                {t('settings:profile.description')}
              </Paragraph>
              
              <Button 
                type="primary" 
                size="large"
                icon={<GlobalOutlined />}
                onClick={() => window.electronAPI.openExternal('https://translateyourgame.com/my-profile')}
                style={{ 
                  height: 48,
                  fontSize: 16,
                  paddingLeft: 24,
                  paddingRight: 24
                }}
              >
                {t('settings:profile.open_button')}
              </Button>
              
              <div style={{ 
                marginTop: 32, 
                padding: 18, 
                backgroundColor: '#1a1a2e', 
                borderRadius: 8, 
                border: '1px solid #8b5cf6' 
              }}>
                <Text strong style={{ color: '#a855f7', fontSize: 14 }}>{t('settings:profile.web_features_title')}</Text>
                <Paragraph style={{ 
                  margin: '10px 0 0 0', 
                  fontSize: 13, 
                  color: '#e5e7eb',
                  lineHeight: 1.6
                }}>
                  {t('settings:profile.web_features_desc')}
                </Paragraph>
              </div>
            </div>
          </div>
        </TabPane>

        <TabPane 
          tab={
            <Space>
              <RobotOutlined />
              AI Models
            </Space>
          } 
          key="models"
        >
          <div style={{ padding: '16px 0' }}>
            {modelsLoading ? (
              <Alert
                message="Loading AI models..."
                description="First-time loading might take a moment. Please wait while we fetch the available models."
                type="info"
                showIcon
              />
            ) : !models ? (
              <Alert
                message="No models loaded"
                description="Please ensure you have a valid API key set and try refreshing."
                type="warning"
                showIcon
              />
            ) : (
              <>
                <Alert
                  message="AI Model Selection"
                  description={`Current active model: ${selectedProvider.toUpperCase()} - ${models?.providers[selectedProvider]?.models[selectedModel]?.display_name || selectedModel || 'None selected'}`}
                  type="success"
                  showIcon
                  style={{ marginBottom: 24 }}
                />

                <div style={{ marginBottom: 24 }}>
                  <Text strong style={{ display: 'block', marginBottom: 12, fontSize: 16 }}>
                    Provider
                  </Text>
                  <Select
                    value={selectedProvider}
                    onChange={handleProviderChange}
                    size="large"
                    style={{ width: '100%', maxWidth: 300 }}
                    options={[
                      {
                        value: 'claude',
                        label: (
                          <Space>
                            <RobotOutlined />
                            Claude API
                          </Space>
                        ),
                      },
                      {
                        value: 'qwen',
                        label: (
                          <Space>
                            <RobotOutlined />
                            QWEN API
                          </Space>
                        ),
                      },
                    ]}
                  />
                </div>

                <div style={{ marginBottom: 24 }}>
                  <Text strong style={{ display: 'block', marginBottom: 12, fontSize: 16 }}>
                    Model ({selectedProvider.toUpperCase()})
                  </Text>
                  
                  {Object.entries(models.providers[selectedProvider].models).map(([modelKey, model]) =>
                    renderModelCard(modelKey, model, selectedModel === modelKey)
                  )}
                </div>

                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                  <Text type="secondary" style={{ fontSize: 13 }}>
                    Click on a model card to select it, then save your selection.
                  </Text>
                  <Button 
                    onClick={saveModelSettings} 
                    type="primary" 
                    size="large"
                    disabled={!selectedModel}
                  >
                    Save Model Settings
                  </Button>
                </div>

                <div style={{ 
                  marginTop: 24, 
                  padding: 16, 
                  backgroundColor: '#1f2937', 
                  borderRadius: 6 
                }}>
                  <Text strong style={{ color: '#10b981' }}>Model Information</Text>
                  <Paragraph style={{ 
                    margin: '8px 0 0 0', 
                    fontSize: 13, 
                    color: '#e5e7eb' 
                  }}>
                    <TrophyOutlined /> Quality: Translation accuracy and fluency<br/>
                    <ThunderboltOutlined /> Speed: Processing time per translation<br/>
                    <DollarOutlined /> Cost: Relative pricing (no specific amounts shown)
                  </Paragraph>
                </div>
              </>
            )}
          </div>
        </TabPane>

        <TabPane 
          tab={
            <Space>
              <TranslationOutlined />
              {t('settings:tabs.language')}
            </Space>
          } 
          key="language"
        >
          <div style={{ padding: '16px 0' }}>
            <Alert
              message={t('settings:language.title')}
              description={t('settings:language.ui_language_description')}
              type="info"
              showIcon
              style={{ marginBottom: 24 }}
            />

            <div style={{ marginBottom: 24 }}>
              <Text strong style={{ display: 'block', marginBottom: 8 }}>
                {t('settings:language.ui_language')}
              </Text>
              <Select
                value={i18n.language as SupportedLanguage}
                onChange={handleLanguageChange}
                size="large"
                style={{ width: '100%', maxWidth: 300 }}
                options={Object.entries(SUPPORTED_LANGUAGES).map(([code, name]) => ({
                  value: code,
                  label: (
                    <Space>
                      <TranslationOutlined />
                      {name}
                    </Space>
                  ),
                }))}
              />
            </div>

            <div style={{ 
              marginTop: 24, 
              padding: 16, 
              backgroundColor: '#1f2937', 
              borderRadius: 6 
            }}>
              <Text strong style={{ color: '#10b981' }}>{t('settings:language.settings_title')}</Text>
              <Paragraph style={{ 
                margin: '8px 0 0 0', 
                fontSize: 13, 
                color: '#e5e7eb' 
              }}>
                {t('settings:language.settings_desc')}
              </Paragraph>
            </div>
          </div>
        </TabPane>
      </Tabs>
    </Modal>
  );
};

export default SettingsModal;