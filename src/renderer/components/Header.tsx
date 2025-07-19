import React from 'react';
import { Layout, Button, Typography, Space, Badge, Menu } from 'antd';
import { SettingOutlined, GlobalOutlined, MessageOutlined, FileTextOutlined, BookOutlined, ThunderboltOutlined, ApiOutlined } from '@ant-design/icons';
import { useTranslation } from 'react-i18next';

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
  const { t } = useTranslation(['header', 'common']);
  
  const menuItems = [
    {
      key: 'chatbot',
      icon: <MessageOutlined />,
      label: t('header:tabs.chatbot')
    },
    {
      key: 'file-translation',
      icon: <FileTextOutlined />,
      label: t('header:tabs.file_translation')
    },
    {
      key: 'glossaries',
      icon: <BookOutlined />,
      label: t('header:tabs.glossaries')
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
            <Text strong style={{ color: '#e2e8f0' }}>{t('common:tokens.balance')}</Text>
          </Badge>
        )}
        
        <Button 
          icon={<GlobalOutlined />}
          onClick={onWebsiteClick}
          type="text"
        >
          {t('common:navigation.website')}
        </Button>
        
        <Button 
          icon={<SettingOutlined />}
          onClick={onSettingsClick}
          type="text"
        >
          {t('header:settings')}
        </Button>
      </Space>
    </AntHeader>
  );
};

export default Header;