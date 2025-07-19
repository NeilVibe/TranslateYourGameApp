import React, { useState, useEffect } from 'react';
import { useTranslation } from 'react-i18next';
import { 
  Card, 
  Typography, 
  Space, 
  Divider, 
  Button, 
  Statistic, 
  Progress,
  Spin,
  Row,
  Col,
  Tag
} from 'antd';
import { 
  CloseOutlined, 
  ReloadOutlined, 
  CrownOutlined,
  FireOutlined,
  CalendarOutlined,
  BarChartOutlined
} from '@ant-design/icons';
import apiClient from '../services/apiClient';

const { Title, Text } = Typography;

interface TokenUsageData {
  current_balance: number;
  usage_today: number;
  usage_week: number;
  total_consumed: number;
  last_updated: string;
  is_unlimited?: boolean;
}

interface TokenBalanceModuleProps {
  visible: boolean;
  onClose: () => void;
  initialBalance?: number;
}

const TokenBalanceModule: React.FC<TokenBalanceModuleProps> = ({
  visible,
  onClose,
  initialBalance = 0
}) => {
  const { t } = useTranslation(['header']);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [usageData, setUsageData] = useState<TokenUsageData>({
    current_balance: initialBalance,
    usage_today: 0,
    usage_week: 0,
    total_consumed: 0,
    last_updated: new Date().toISOString(),
    is_unlimited: false
  });

  const loadUsageData = async () => {
    setLoading(true);
    setError(null);
    
    try {
      // Simulated API call - replace with actual endpoint
      // const response = await apiClient.getTokenUsage();
      
      // Mock data for demonstration
      await new Promise(resolve => setTimeout(resolve, 1000));
      
      const mockData: TokenUsageData = {
        current_balance: initialBalance,
        usage_today: Math.floor(Math.random() * 150) + 20,
        usage_week: Math.floor(Math.random() * 800) + 200,
        total_consumed: Math.floor(Math.random() * 5000) + 1000,
        last_updated: new Date().toISOString(),
        is_unlimited: initialBalance > 999999
      };
      
      setUsageData(mockData);
    } catch (err: any) {
      console.error('Failed to load token usage:', err);
      setError(t('header:token_module.error'));
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (visible) {
      loadUsageData();
    }
  }, [visible]);


  const getUsageColor = (usage: number, max: number = 1000) => {
    const percentage = (usage / max) * 100;
    if (percentage < 30) return '#52c41a';
    if (percentage < 70) return '#faad14';
    return '#ff4d4f';
  };

  const formatLastUpdated = () => {
    const date = new Date(usageData.last_updated);
    return date.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
  };

  if (!visible) return null;

  return (
    <div 
      className="token-balance-overlay"
      style={{
        position: 'fixed',
        top: 0,
        left: 0,
        right: 0,
        bottom: 0,
        backgroundColor: 'rgba(0, 0, 0, 0.5)',
        zIndex: 1000,
        display: 'flex',
        alignItems: 'flex-start',
        justifyContent: 'flex-end',
        paddingTop: '60px',
        paddingRight: '20px'
      }}
      onClick={onClose}
    >
      <div
        className="token-balance-module"
        style={{
          animation: visible ? 'slideInRight 0.3s ease-out' : 'slideOutRight 0.3s ease-in',
          transformOrigin: 'top right'
        }}
        onClick={(e) => e.stopPropagation()}
      >
        <Card
          style={{
            width: 480,
            background: 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)',
            border: 'none',
            borderRadius: 16,
            overflow: 'hidden',
            boxShadow: '0 20px 40px rgba(0,0,0,0.3)'
          }}
          styles={{ 
            body: { padding: 0 } 
          }}
        >
          {/* Header */}
          <div style={{
            background: 'rgba(255,255,255,0.15)',
            padding: '20px',
            backdropFilter: 'blur(10px)',
            borderBottom: '1px solid rgba(255,255,255,0.2)'
          }}>
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
                <CrownOutlined style={{ fontSize: 24, color: '#FFD700' }} />
                <Title level={3} style={{ color: 'white', margin: 0, fontSize: 18 }}>
                  {t('header:token_module.title')}
                </Title>
              </div>
              <Space>
                <Button 
                  type="text" 
                  icon={<ReloadOutlined />}
                  onClick={loadUsageData}
                  loading={loading}
                  style={{ color: 'white', border: '1px solid rgba(255,255,255,0.3)' }}
                  size="small"
                />
                <Button 
                  type="text" 
                  icon={<CloseOutlined />}
                  onClick={onClose}
                  style={{ color: 'white', border: '1px solid rgba(255,255,255,0.3)' }}
                  size="small"
                />
              </Space>
            </div>
          </div>

          {/* Content */}
          <div style={{ padding: '24px' }}>
            {loading ? (
              <div style={{ textAlign: 'center', padding: '40px 0' }}>
                <Spin size="large" />
                <div style={{ marginTop: 16, color: 'rgba(255,255,255,0.8)' }}>
                  {t('header:token_module.loading')}
                </div>
              </div>
            ) : error ? (
              <div style={{ textAlign: 'center', padding: '40px 0' }}>
                <div style={{ color: '#ff7875', marginBottom: 16 }}>
                  {error}
                </div>
                <Button 
                  type="primary" 
                  onClick={loadUsageData}
                  style={{ background: '#8b5cf6', borderColor: '#8b5cf6' }}
                >
                  {t('header:token_module.refresh')}
                </Button>
              </div>
            ) : (
              <Space direction="vertical" style={{ width: '100%' }} size="large">
                {/* Current Balance */}
                <div style={{ textAlign: 'center' }}>
                  <div style={{ 
                    fontSize: 48, 
                    fontWeight: 'bold', 
                    color: 'white',
                    textShadow: '0 2px 4px rgba(0,0,0,0.3)',
                    marginBottom: 8
                  }}>
                    {usageData.is_unlimited ? '∞' : usageData.current_balance.toLocaleString()}
                  </div>
                  <Text style={{ color: 'rgba(255,255,255,0.8)', fontSize: 16 }}>
                    {usageData.is_unlimited ? t('header:token_module.unlimited') : t('header:token_module.current_balance')}
                  </Text>
                  {!usageData.is_unlimited && (
                    <div style={{ marginTop: 8 }}>
                      <Progress 
                        percent={Math.min((usageData.current_balance / 10000) * 100, 100)}
                        strokeColor={{
                          '0%': '#FFD700',
                          '50%': '#FF6B6B', 
                          '100%': '#4ECDC4'
                        }}
                        trailColor="rgba(255,255,255,0.2)"
                        showInfo={false}
                        strokeWidth={8}
                      />
                    </div>
                  )}
                </div>

                <Divider style={{ borderColor: 'rgba(255,255,255,0.2)', margin: '16px 0' }} />

                {/* Usage Statistics */}
                <div>
                  <Text strong style={{ color: 'white', fontSize: 16, display: 'block', marginBottom: 16 }}>
                    <BarChartOutlined style={{ marginRight: 8 }} />
                    {t('header:token_module.usage_stats')}
                  </Text>
                  
                  <Row gutter={[24, 0]}>
                    <Col span={12}>
                      <Card style={{ 
                        background: 'rgba(255,255,255,0.15)', 
                        border: 'none',
                        borderRadius: 12,
                        height: '100px'
                      }}>
                        <Statistic
                          title={
                            <span style={{ color: 'rgba(255,255,255,0.8)', fontSize: 14 }}>
                              <FireOutlined style={{ marginRight: 6 }} />
                              {t('header:token_module.usage_today')}
                            </span>
                          }
                          value={usageData.usage_today}
                          suffix={
                            <span style={{ fontSize: 14, color: 'rgba(255,255,255,0.7)' }}>
                              {t('header:token_module.tokens')}
                            </span>
                          }
                          valueStyle={{ 
                            color: getUsageColor(usageData.usage_today),
                            fontSize: 28,
                            fontWeight: 'bold'
                          }}
                        />
                      </Card>
                    </Col>
                    
                    <Col span={12}>
                      <Card style={{ 
                        background: 'rgba(255,255,255,0.15)', 
                        border: 'none',
                        borderRadius: 12,
                        height: '100px'
                      }}>
                        <Statistic
                          title={
                            <span style={{ color: 'rgba(255,255,255,0.8)', fontSize: 14 }}>
                              <CalendarOutlined style={{ marginRight: 6 }} />
                              {t('header:token_module.usage_week')}
                            </span>
                          }
                          value={usageData.usage_week}
                          suffix={
                            <span style={{ fontSize: 14, color: 'rgba(255,255,255,0.7)' }}>
                              {t('header:token_module.tokens')}
                            </span>
                          }
                          valueStyle={{ 
                            color: getUsageColor(usageData.usage_week, 5000),
                            fontSize: 28,
                            fontWeight: 'bold'
                          }}
                        />
                      </Card>
                    </Col>
                  </Row>
                </div>

                {/* Footer */}
                <div style={{ 
                  textAlign: 'center',
                  paddingTop: 16,
                  borderTop: '1px solid rgba(255,255,255,0.2)'
                }}>
                  <Text style={{ color: 'rgba(255,255,255,0.6)', fontSize: 12 }}>
                    {t('header:token_module.last_updated')}: {formatLastUpdated()}
                  </Text>
                </div>
              </Space>
            )}
          </div>
        </Card>
      </div>

      <style>{`
        @keyframes slideInRight {
          from {
            transform: translateX(100%) scale(0.9);
            opacity: 0;
          }
          to {
            transform: translateX(0) scale(1);
            opacity: 1;
          }
        }
        
        @keyframes slideOutRight {
          from {
            transform: translateX(0) scale(1);
            opacity: 1;
          }
          to {
            transform: translateX(100%) scale(0.9);
            opacity: 0;
          }
        }
        
      `}</style>
    </div>
  );
};

export default TokenBalanceModule;