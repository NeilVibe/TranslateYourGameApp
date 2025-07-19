import React, { useState, useEffect } from 'react';
import { Modal, Form, Input, Button, Typography, Space, Alert, Tabs, message, Select } from 'antd';
import { KeyOutlined, GlobalOutlined, UserOutlined, TranslationOutlined } from '@ant-design/icons';
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

  // Update form when API key changes or modal opens
  useEffect(() => {
    if (visible) {
      apiForm.setFieldsValue({ apiKey });
    }
  }, [visible, apiKey, apiForm]);

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