import React, { useState } from 'react';
import { Layout, Button, Typography, Space, Menu } from 'antd';
import { SettingOutlined, GlobalOutlined, MessageOutlined, FileTextOutlined, BookOutlined, ThunderboltOutlined, ApiOutlined, CrownOutlined } from '@ant-design/icons';
import { useTranslation } from 'react-i18next';
import TokenBalanceModule from './TokenBalanceModule';

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
  const [tokenModuleVisible, setTokenModuleVisible] = useState(false);
  
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
          <Button 
            type="text"
            icon={<CrownOutlined />}
            onClick={() => setTokenModuleVisible(true)}
            style={{
              color: '#FFD700',
              border: '1px solid rgba(255, 215, 0, 0.3)',
              background: 'linear-gradient(135deg, rgba(255, 215, 0, 0.1), rgba(139, 92, 246, 0.1))',
              borderRadius: '8px',
              height: '36px',
              padding: '0 12px',
              display: 'flex',
              alignItems: 'center',
              gap: '8px',
              transition: 'all 0.3s ease'
            }}
            onMouseEnter={(e) => {
              e.currentTarget.style.background = 'linear-gradient(135deg, rgba(255, 215, 0, 0.2), rgba(139, 92, 246, 0.2))';
              e.currentTarget.style.transform = 'scale(1.05)';
            }}
            onMouseLeave={(e) => {
              e.currentTarget.style.background = 'linear-gradient(135deg, rgba(255, 215, 0, 0.1), rgba(139, 92, 246, 0.1))';
              e.currentTarget.style.transform = 'scale(1)';
            }}
          >
            <Text strong style={{ color: '#FFD700', fontSize: 14 }}>
              {t('header:token_balance', { balance: tokenBalance.toLocaleString() })}
            </Text>
          </Button>
        )}
        
        <Button 
          icon={<GlobalOutlined />}
          onClick={onWebsiteClick}
          type="text"
          style={{ color: '#e2e8f0' }}
        >
          {t('common:navigation.website')}
        </Button>
        
        <Button 
          icon={<SettingOutlined />}
          onClick={onSettingsClick}
          type="text"
          style={{ color: '#e2e8f0' }}
        >
          {t('header:settings')}
        </Button>
      </Space>

      {/* Token Balance Module */}
      <TokenBalanceModule
        visible={tokenModuleVisible}
        onClose={() => setTokenModuleVisible(false)}
        initialBalance={tokenBalance || 0}
      />
    </AntHeader>
  );
};

export default Header;