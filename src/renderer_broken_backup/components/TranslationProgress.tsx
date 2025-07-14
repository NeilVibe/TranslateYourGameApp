import React from 'react';
import { Card, Progress, Typography, Space, Spin, Statistic, Row, Col } from 'antd';
import { LoadingOutlined, CheckCircleOutlined, ClockCircleOutlined } from '@ant-design/icons';

const { Title, Text } = Typography;

interface TranslationProgressProps {
  task: any;
  totalEntries: number;
}

const TranslationProgress: React.FC<TranslationProgressProps> = ({
  task,
  totalEntries
}) => {
  if (!task) {
    return (
      <div style={{ 
        display: 'flex', 
        justifyContent: 'center', 
        alignItems: 'center',
        minHeight: '60vh' 
      }}>
        <Spin size="large" />
      </div>
    );
  }

  const getStatusIcon = () => {
    switch (task.status) {
      case 'completed':
        return <CheckCircleOutlined style={{ color: '#52c41a', fontSize: 48 }} />;
      case 'processing':
        return <LoadingOutlined style={{ color: '#1890ff', fontSize: 48 }} />;
      case 'queued':
        return <ClockCircleOutlined style={{ color: '#faad14', fontSize: 48 }} />;
      default:
        return <LoadingOutlined style={{ color: '#1890ff', fontSize: 48 }} />;
    }
  };

  const getStatusText = () => {
    switch (task.status) {
      case 'completed':
        return 'Translation Complete!';
      case 'processing':
        return 'Translation in Progress...';
      case 'queued':
        return 'Translation Queued...';
      case 'failed':
        return 'Translation Failed';
      default:
        return 'Processing...';
    }
  };

  const getProgressColor = () => {
    if (task.status === 'completed') return '#52c41a';
    if (task.status === 'failed') return '#ff4d4f';
    return '#1890ff';
  };

  return (
    <div style={{ 
      display: 'flex', 
      justifyContent: 'center', 
      alignItems: 'center',
      minHeight: '60vh',
      padding: 24
    }}>
      <Card 
        style={{ 
          width: 600,
          textAlign: 'center',
          boxShadow: '0 4px 12px rgba(0,0,0,0.1)'
        }}
      >
        <div style={{ padding: '48px 24px' }}>
          <div style={{ marginBottom: 32 }}>
            {getStatusIcon()}
          </div>
          
          <Title level={3} style={{ marginBottom: 8 }}>
            {getStatusText()}
          </Title>
          
          {task.current_phase && (
            <Text type="secondary" style={{ fontSize: 16, display: 'block', marginBottom: 24 }}>
              {task.current_phase}
            </Text>
          )}
          
          <div style={{ marginBottom: 32 }}>
            <Progress 
              percent={task.progress || 0}
              strokeColor={getProgressColor()}
              size="small"
              style={{ marginBottom: 16 }}
            />
            
            <Row gutter={24}>
              <Col span={8}>
                <Statistic
                  title="Progress"
                  value={task.progress || 0}
                  suffix="%"
                  valueStyle={{ color: getProgressColor() }}
                />
              </Col>
              <Col span={8}>
                <Statistic
                  title="Completed"
                  value={task.items_completed || 0}
                  suffix={`/ ${task.total_items || totalEntries}`}
                  valueStyle={{ color: getProgressColor() }}
                />
              </Col>
              <Col span={8}>
                <Statistic
                  title="Status"
                  value={task.status || 'Unknown'}
                  valueStyle={{ 
                    color: getProgressColor(),
                    fontSize: 16,
                    textTransform: 'capitalize'
                  }}
                />
              </Col>
            </Row>
          </div>
          
          {task.status === 'processing' && (
            <Space direction="vertical" size={8}>
              <Text type="secondary">
                🤖 AI is working on your translations...
              </Text>
              <Text type="secondary" style={{ fontSize: 12 }}>
                This may take a few minutes depending on file size
              </Text>
            </Space>
          )}
          
          {task.status === 'completed' && (
            <Space direction="vertical" size={8}>
              <Text type="success" style={{ fontSize: 16 }}>
                🎉 Your translations are ready!
              </Text>
              <Text type="secondary" style={{ fontSize: 12 }}>
                File will be saved automatically
              </Text>
            </Space>
          )}
          
          {task.status === 'failed' && task.error_message && (
            <Space direction="vertical" size={8}>
              <Text type="danger" style={{ fontSize: 16 }}>
                ❌ Translation failed
              </Text>
              <Text type="secondary" style={{ fontSize: 12 }}>
                {task.error_message}
              </Text>
            </Space>
          )}
        </div>
      </Card>
    </div>
  );
};

export default TranslationProgress;