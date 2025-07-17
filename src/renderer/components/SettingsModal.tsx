import React, { useState, useEffect } from 'react';
import { Modal, Form, Input, Button, Typography, Space, Alert, Tabs, message } from 'antd';
import { KeyOutlined, GlobalOutlined, UserOutlined } from '@ant-design/icons';
import apiClient from '../services/apiClient';

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

  return (
    <Modal
      title={
        <Space>
          <UserOutlined />
          Settings
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
              API Key
            </Space>
          } 
          key="api"
        >
          <div style={{ padding: '16px 0' }}>
            <Alert
              message={apiKey ? "API Key Settings" : "API Key Required"}
              description={apiKey ? 
                "Your API key is saved securely. You can update it below if needed." :
                "You need an API key to use this desktop app. Get one from your Translate Your Game account."
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
                label="API Key"
                name="apiKey"
                rules={[
                  { required: true, message: 'Please enter your API key' },
                  { pattern: /^tk_live_/, message: 'API key must start with tk_live_' }
                ]}
              >
                <Input.Password
                  placeholder="tk_live_..."
                  size="large"
                  prefix={<KeyOutlined />}
                />
              </Form.Item>

              <Space direction="vertical" size={16} style={{ width: '100%' }}>
                <div>
                  <Paragraph type="secondary">
                    Don't have an API key yet?
                  </Paragraph>
                  <Button 
                    icon={<GlobalOutlined />}
                    onClick={handleGetApiKey}
                    type="link"
                    style={{ padding: 0 }}
                  >
                    Get API Key from Website
                  </Button>
                </div>

                <div style={{ display: 'flex', justifyContent: 'flex-end', gap: 8 }}>
                  <Button onClick={onClose}>
                    Cancel
                  </Button>
                  <Button 
                    type="primary" 
                    htmlType="submit"
                    loading={loading}
                  >
                    Save API Key
                  </Button>
                </div>
              </Space>
            </Form>

            <div style={{ marginTop: 24, padding: 16, backgroundColor: '#1f2937', borderRadius: 6 }}>
              <Text strong style={{ color: '#10b981' }}>Security & Storage:</Text>
              <Paragraph style={{ margin: '8px 0 0 0', fontSize: 13, color: '#e5e7eb' }}>
                • Your API key is automatically saved and encrypted locally on your device<br/>
                • Never shared with third parties - used only for Translate Your Game API<br/>
                • You only need to enter it once - it will be remembered for future sessions
              </Paragraph>
            </div>
          </div>
        </TabPane>

        <TabPane 
          tab={
            <Space>
              <UserOutlined />
              My Profile
            </Space>
          } 
          key="profile"
        >
          <div style={{ padding: '16px 0' }}>
            <div style={{ textAlign: 'center', padding: 40 }}>
              <Title level={3}>Manage Your Profile</Title>
              <Paragraph style={{ marginBottom: 24, fontSize: 15, color: '#8c8c8c' }}>
                Access your profile, billing, usage statistics, and account settings on the web dashboard.
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
                Open My Profile
              </Button>
              
              <div style={{ 
                marginTop: 32, 
                padding: 18, 
                backgroundColor: '#1a1a2e', 
                borderRadius: 8, 
                border: '1px solid #8b5cf6' 
              }}>
                <Text strong style={{ color: '#a855f7', fontSize: 14 }}>Available on Web Profile:</Text>
                <Paragraph style={{ 
                  margin: '10px 0 0 0', 
                  fontSize: 13, 
                  color: '#e5e7eb',
                  lineHeight: 1.6
                }}>
                  • Update profile information & password<br/>
                  • View detailed usage statistics & billing<br/>
                  • Manage API keys & subscription<br/>
                  • Download invoices & usage reports
                </Paragraph>
              </div>
            </div>
          </div>
        </TabPane>
      </Tabs>
    </Modal>
  );
};

export default SettingsModal;