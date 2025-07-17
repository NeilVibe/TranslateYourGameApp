import React, { useState, useEffect } from 'react';
import { Modal, Form, Input, Button, Typography, Space, Alert, Tabs, message, Divider, Row, Col, Card, Statistic } from 'antd';
import { KeyOutlined, GlobalOutlined, UserOutlined, LockOutlined, MailOutlined, TeamOutlined, DollarOutlined, BarChartOutlined } from '@ant-design/icons';
import apiClient from '../services/apiClient';

const { Text, Paragraph, Title } = Typography;
const { TabPane } = Tabs;

interface SettingsModalProps {
  visible: boolean;
  apiKey: string | null;
  onClose: () => void;
  onSave: (apiKey: string) => void;
}

interface UserInfo {
  id: number;
  username: string;
  email: string;
  is_admin: boolean;
  is_email_verified: boolean;
  created_at: string;
  company?: string;
  token_balance: number;
  api_keys_count: number;
  translation_count: number;
}

const SettingsModal: React.FC<SettingsModalProps> = ({
  visible,
  apiKey,
  onClose,
  onSave
}) => {
  const [apiForm] = Form.useForm();
  const [passwordForm] = Form.useForm();
  const [profileForm] = Form.useForm();
  const [loading, setLoading] = useState(false);
  const [activeTab, setActiveTab] = useState('api');
  const [userInfo, setUserInfo] = useState<UserInfo | null>(null);
  const [loadingUser, setLoadingUser] = useState(false);

  // Fetch user info when modal opens and API key exists
  useEffect(() => {
    if (visible && apiKey) {
      fetchUserInfo();
    }
  }, [visible, apiKey]);

  // Update form when API key changes or modal opens
  useEffect(() => {
    if (visible) {
      apiForm.setFieldsValue({ apiKey });
    }
  }, [visible, apiKey, apiForm]);

  const fetchUserInfo = async () => {
    if (!apiKey) return;
    
    setLoadingUser(true);
    try {
      const response = await apiClient.getUserInfo();
      setUserInfo(response.user);
      profileForm.setFieldsValue({
        username: response.user.username,
        email: response.user.email,
        company: response.user.company
      });
    } catch (error) {
      console.error('Failed to fetch user info:', error);
    } finally {
      setLoadingUser(false);
    }
  };

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

  const handlePasswordChange = async (values: { currentPassword: string; newPassword: string; confirmPassword: string }) => {
    setLoading(true);
    try {
      await apiClient.changePassword(values.currentPassword, values.newPassword);
      message.success('Password changed successfully');
      passwordForm.resetFields();
    } catch (error: any) {
      message.error(error.response?.data?.error || 'Failed to change password');
    } finally {
      setLoading(false);
    }
  };

  const handleProfileUpdate = async (values: { username: string; email: string; company?: string }) => {
    setLoading(true);
    try {
      await apiClient.updateProfile(values);
      message.success('Profile updated successfully');
      await fetchUserInfo(); // Refresh user info
    } catch (error: any) {
      message.error(error.response?.data?.error || 'Failed to update profile');
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

            <div style={{ marginTop: 24, padding: 16, backgroundColor: '#f5f5f5', borderRadius: 6 }}>
              <Text strong>Security & Storage:</Text>
              <Paragraph type="secondary" style={{ margin: '8px 0 0 0', fontSize: 12 }}>
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
              Profile
            </Space>
          } 
          key="profile"
          disabled={!apiKey}
        >
          <div style={{ padding: '16px 0' }}>
            {loadingUser ? (
              <div style={{ textAlign: 'center', padding: 40 }}>
                <Text type="secondary">Loading user information...</Text>
              </div>
            ) : userInfo ? (
              <>
                <Title level={4}>Profile Information</Title>
                <Form
                  form={profileForm}
                  layout="vertical"
                  onFinish={handleProfileUpdate}
                >
                  <Row gutter={16}>
                    <Col span={12}>
                      <Form.Item
                        label="Username"
                        name="username"
                        rules={[{ required: true, message: 'Username is required' }]}
                      >
                        <Input prefix={<UserOutlined />} />
                      </Form.Item>
                    </Col>
                    <Col span={12}>
                      <Form.Item
                        label="Email"
                        name="email"
                        rules={[
                          { required: true, message: 'Email is required' },
                          { type: 'email', message: 'Please enter a valid email' }
                        ]}
                      >
                        <Input prefix={<MailOutlined />} />
                      </Form.Item>
                    </Col>
                  </Row>

                  <Form.Item
                    label="Company (Optional)"
                    name="company"
                  >
                    <Input prefix={<TeamOutlined />} placeholder="Your company name" />
                  </Form.Item>

                  <div style={{ display: 'flex', justifyContent: 'flex-end', gap: 8 }}>
                    <Button onClick={() => profileForm.resetFields()}>
                      Reset
                    </Button>
                    <Button 
                      type="primary" 
                      htmlType="submit"
                      loading={loading}
                    >
                      Update Profile
                    </Button>
                  </div>
                </Form>

                <Divider />

                <Title level={4}>Account Statistics</Title>
                <Row gutter={16}>
                  <Col span={8}>
                    <Card>
                      <Statistic
                        title="Token Balance"
                        value={userInfo.token_balance}
                        prefix={<DollarOutlined />}
                        precision={2}
                      />
                    </Card>
                  </Col>
                  <Col span={8}>
                    <Card>
                      <Statistic
                        title="API Keys"
                        value={userInfo.api_keys_count}
                        prefix={<KeyOutlined />}
                      />
                    </Card>
                  </Col>
                  <Col span={8}>
                    <Card>
                      <Statistic
                        title="Translations"
                        value={userInfo.translation_count}
                        prefix={<BarChartOutlined />}
                      />
                    </Card>
                  </Col>
                </Row>
              </>
            ) : (
              <Alert
                message="No user information available"
                description="Please ensure you have a valid API key configured."
                type="warning"
              />
            )}
          </div>
        </TabPane>

        <TabPane 
          tab={
            <Space>
              <LockOutlined />
              Security
            </Space>
          } 
          key="security"
          disabled={!apiKey}
        >
          <div style={{ padding: '16px 0' }}>
            <Title level={4}>Change Password</Title>
            <Form
              form={passwordForm}
              layout="vertical"
              onFinish={handlePasswordChange}
              autoComplete="off"
            >
              <Form.Item
                label="Current Password"
                name="currentPassword"
                rules={[{ required: true, message: 'Please enter your current password' }]}
              >
                <Input.Password autoComplete="current-password" />
              </Form.Item>

              <Form.Item
                label="New Password"
                name="newPassword"
                rules={[
                  { required: true, message: 'Please enter a new password' },
                  { min: 8, message: 'Password must be at least 8 characters' }
                ]}
              >
                <Input.Password autoComplete="new-password" />
              </Form.Item>

              <Form.Item
                label="Confirm New Password"
                name="confirmPassword"
                dependencies={['newPassword']}
                rules={[
                  { required: true, message: 'Please confirm your new password' },
                  ({ getFieldValue }) => ({
                    validator(_, value) {
                      if (!value || getFieldValue('newPassword') === value) {
                        return Promise.resolve();
                      }
                      return Promise.reject(new Error('Passwords do not match'));
                    },
                  }),
                ]}
              >
                <Input.Password autoComplete="new-password" />
              </Form.Item>

              <div style={{ display: 'flex', justifyContent: 'flex-end', gap: 8 }}>
                <Button onClick={() => passwordForm.resetFields()}>
                  Reset
                </Button>
                <Button 
                  type="primary" 
                  htmlType="submit"
                  loading={loading}
                >
                  Change Password
                </Button>
              </div>
            </Form>

            <Divider />

            <Alert
              message="Security Tips"
              description={
                <ul style={{ margin: '8px 0 0 0', paddingLeft: 20 }}>
                  <li>Use a strong password with at least 8 characters</li>
                  <li>Include numbers, symbols, and mixed case letters</li>
                  <li>Don't reuse passwords from other services</li>
                  <li>Change your password regularly</li>
                </ul>
              }
              type="info"
              showIcon
            />
          </div>
        </TabPane>
      </Tabs>
    </Modal>
  );
};

export default SettingsModal;