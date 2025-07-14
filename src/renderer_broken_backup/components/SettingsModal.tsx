import React, { useState } from 'react';
import { Modal, Form, Input, Button, Typography, Space, Alert } from 'antd';
import { KeyOutlined, GlobalOutlined } from '@ant-design/icons';

const { Text, Paragraph } = Typography;

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
  const [form] = Form.useForm();
  const [loading, setLoading] = useState(false);

  const handleSubmit = async (values: { apiKey: string }) => {
    setLoading(true);
    try {
      await onSave(values.apiKey);
    } finally {
      setLoading(false);
    }
  };

  const handleGetApiKey = () => {
    window.electronAPI.openExternal('https://translateyourgame.com/profile/api-keys');
  };

  return (
    <Modal
      title={
        <Space>
          <KeyOutlined />
          API Settings
        </Space>
      }
      open={visible}
      onCancel={onClose}
      footer={null}
      width={600}
    >
      <div style={{ padding: '16px 0' }}>
        <Alert
          message="API Key Required"
          description="You need an API key to use this desktop app. Get one from your Translate Your Game account."
          type="info"
          showIcon
          style={{ marginBottom: 24 }}
        />

        <Form
          form={form}
          layout="vertical"
          onFinish={handleSubmit}
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

        <div style={{ marginTop: 24, padding: 16, backgroundColor: '#f5f5f5', borderRadius: 6 }}>
          <Text strong>Security Note:</Text>
          <Paragraph type="secondary" style={{ margin: '8px 0 0 0', fontSize: 12 }}>
            Your API key is stored locally on your device and never shared with third parties.
            It's used only to authenticate with the Translate Your Game API.
          </Paragraph>
        </div>
      </div>
    </Modal>
  );
};

export default SettingsModal;