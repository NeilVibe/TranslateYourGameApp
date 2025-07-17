import React from 'react';
import { Layout, Button, Typography, Space, Badge, Menu } from 'antd';
import { SettingOutlined, GlobalOutlined, MessageOutlined, FileTextOutlined, BookOutlined, ThunderboltOutlined, ApiOutlined } from '@ant-design/icons';

const { Header: AntHeader } = Layout;
const { Title, Text } = Typography;

interface HeaderProps {
  tokenBalance: number | null;
  onSettingsClick: () => void;
  onWebsiteClick: () => void;
  currentTab: string;
  onTabChange: (tab: string) => void;
}

const Header: React.FC<HeaderProps> = ({ 
  tokenBalance, 
  onSettingsClick, 
  onWebsiteClick,
  currentTab,
  onTabChange
}) => {
  const menuItems = [
    {
      key: 'chatbot',
      icon: <MessageOutlined />,
      label: 'Chatbot'
    },
    {
      key: 'file-translation',
      icon: <FileTextOutlined />,
      label: 'File Translation'
    },
    {
      key: 'glossaries',
      icon: <BookOutlined />,
      label: 'Glossaries'
    }
  ];

  return (
    <AntHeader style={{
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'space-between',
      background: '#0f0f23',
      borderBottom: '1px solid #2d3748',
      padding: '0 24px',
      height: 64
    }}>
      <div style={{ display: 'flex', alignItems: 'center', flex: 1 }}>
        <Title level={4} style={{ margin: 0, color: '#8b5cf6', marginRight: 24, display: 'flex', alignItems: 'center', gap: '8px' }}>
          <ApiOutlined />
          Translate Your Game
        </Title>
        
        <Menu
          mode="horizontal"
          selectedKeys={[currentTab]}
          items={menuItems}
          onClick={({ key }) => onTabChange(key)}
          style={{ 
            border: 'none', 
            flex: 1, 
            background: 'transparent',
            color: '#e2e8f0'
          }}
        />
      </div>
      
      <Space size="large">
        {tokenBalance !== null && (
          <Badge count={tokenBalance} showZero style={{ backgroundColor: '#8b5cf6' }}>
            <Text strong style={{ color: '#e2e8f0' }}>Tokens</Text>
          </Badge>
        )}
        
        <Button 
          icon={<GlobalOutlined />}
          onClick={onWebsiteClick}
          type="text"
        >
          Website
        </Button>
        
        <Button 
          icon={<SettingOutlined />}
          onClick={onSettingsClick}
          type="text"
        >
          Settings
        </Button>
      </Space>
    </AntHeader>
  );
};

export default Header;