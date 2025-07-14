import React, { useEffect, useState } from 'react';
import { Card, Progress, Typography, Space, Row, Col, Statistic, Timeline, Badge } from 'antd';
import { 
  LoadingOutlined, 
  CheckCircleOutlined, 
  ClockCircleOutlined,
  ThunderboltOutlined,
  DashboardOutlined,
  ApartmentOutlined,
  TranslationOutlined
} from '@ant-design/icons';

const { Title, Text, Paragraph } = Typography;

interface ClusterProgressProps {
  task: any;
  totalEntries: number;
}

const ClusterPreprocessingProgress: React.FC<ClusterProgressProps> = ({
  task,
  totalEntries
}) => {
  const [animatedProgress, setAnimatedProgress] = useState(0);
  const [animatedPhaseProgress, setAnimatedPhaseProgress] = useState(0);

  // Smooth progress animation
  useEffect(() => {
    if (task?.progress !== undefined) {
      const timer = setInterval(() => {
        setAnimatedProgress(prev => {
          const diff = (task.progress || 0) - prev;
          if (Math.abs(diff) < 1) return task.progress || 0;
          return prev + diff * 0.1;
        });
      }, 50);
      return () => clearInterval(timer);
    }
  }, [task?.progress]);

  useEffect(() => {
    if (task?.phase_progress !== undefined) {
      const timer = setInterval(() => {
        setAnimatedPhaseProgress(prev => {
          const diff = (task.phase_progress || 0) - prev;
          if (Math.abs(diff) < 1) return task.phase_progress || 0;
          return prev + diff * 0.1;
        });
      }, 50);
      return () => clearInterval(timer);
    }
  }, [task?.phase_progress]);

  if (!task) {
    return (
      <div style={{ 
        display: 'flex', 
        justifyContent: 'center', 
        alignItems: 'center',
        minHeight: '60vh' 
      }}>
        <LoadingOutlined style={{ fontSize: 48, color: '#1890ff' }} />
      </div>
    );
  }

  const getPhaseIcon = (phase: string) => {
    if (phase?.includes('embedding')) return <DashboardOutlined />;
    if (phase?.includes('clustering') || phase?.includes('graph')) return <ApartmentOutlined />;
    if (phase?.includes('translating') || phase?.includes('representative')) return <TranslationOutlined />;
    return <LoadingOutlined />;
  };

  const getStatusColor = () => {
    if (task.status === 'completed') return '#52c41a';
    if (task.status === 'failed') return '#ff4d4f';
    return '#1890ff';
  };

  const formatTime = (seconds: number) => {
    if (!seconds) return 'Calculating...';
    if (seconds < 60) return `${seconds}s`;
    const minutes = Math.floor(seconds / 60);
    const remainingSeconds = seconds % 60;
    return `${minutes}m ${remainingSeconds}s`;
  };

  const renderClusterStats = () => {
    const clusterStats = task.detailed_status?.cluster_stats;
    if (!clusterStats) return null;

    return (
      <Card 
        title={
          <Space>
            <ApartmentOutlined style={{ color: '#722ed1' }} />
            <Text strong>Cluster Analysis</Text>
          </Space>
        }
        size="small"
        style={{ marginBottom: 16 }}
      >
        <Row gutter={16}>
          <Col span={8}>
            <Statistic
              title="Clusters Found"
              value={clusterStats.clusters_found}
              valueStyle={{ color: '#722ed1' }}
            />
          </Col>
          <Col span={8}>
            <Statistic
              title="Entries Clustered"
              value={clusterStats.total_entries_clustered}
              suffix={`/ ${totalEntries}`}
              valueStyle={{ color: '#722ed1' }}
            />
          </Col>
          <Col span={8}>
            <Statistic
              title="Avg Cluster Size"
              value={clusterStats.average_cluster_size}
              precision={1}
              valueStyle={{ color: '#722ed1' }}
            />
          </Col>
        </Row>
        
        {clusterStats.cluster_size_distribution && (
          <div style={{ marginTop: 16 }}>
            <Text type="secondary">Cluster Size Distribution:</Text>
            <div style={{ marginTop: 8 }}>
              {clusterStats.cluster_size_distribution.slice(0, 5).map((size: number, index: number) => (
                <Badge 
                  key={index}
                  count={size} 
                  color="#722ed1" 
                  style={{ margin: '0 4px' }}
                />
              ))}
            </div>
          </div>
        )}
      </Card>
    );
  };

  const renderCurrentRepresentative = () => {
    const currentRep = task.detailed_status?.current_representative;
    const lastTranslation = task.detailed_status?.last_successful_translation;
    
    if (!currentRep && !lastTranslation) return null;

    return (
      <Card 
        title={
          <Space>
            <TranslationOutlined style={{ color: '#13c2c2' }} />
            <Text strong>Representative Translation</Text>
          </Space>
        }
        size="small"
        style={{ marginBottom: 16 }}
      >
        {currentRep && (
          <div style={{ marginBottom: 16 }}>
            <Space direction="vertical" size={4} style={{ width: '100%' }}>
              <Text strong>Currently Processing:</Text>
              <Text 
                code 
                style={{ 
                  backgroundColor: '#f6ffed', 
                  padding: '8px',
                  borderRadius: '4px',
                  display: 'block'
                }}
              >
                {currentRep.text}
              </Text>
              <Space>
                <Badge color="#13c2c2" text={`Cluster Size: ${currentRep.cluster_size}`} />
                <Badge color="#13c2c2" text={`Step: ${currentRep.processing_step}`} />
              </Space>
            </Space>
          </div>
        )}

        {lastTranslation && (
          <div>
            <Text strong>Last Completed:</Text>
            <div style={{ 
              backgroundColor: '#f0f9ff', 
              padding: '12px', 
              borderRadius: '6px',
              marginTop: '8px',
              border: '1px solid #d1ecf1'
            }}>
              <Space direction="vertical" size={4} style={{ width: '100%' }}>
                <Text type="secondary">Source:</Text>
                <Text>{lastTranslation.source}</Text>
                <Text type="secondary">Translation:</Text>
                <Text strong style={{ color: '#13c2c2' }}>{lastTranslation.target}</Text>
                <Badge color="#52c41a" text={`Cluster Size: ${lastTranslation.cluster_size}`} />
              </Space>
            </div>
          </div>
        )}
      </Card>
    );
  };

  const renderPhaseTimeline = () => {
    const phases = [
      { title: 'Embedding Generation', status: 'finish' },
      { title: 'Similarity Analysis', status: task.detailed_status?.embedding_stats?.embedding_phase_complete ? 'finish' : 'process' },
      { title: 'Cluster Formation', status: task.detailed_status?.cluster_stats?.clustering_phase_complete ? 'finish' : 'process' },
      { title: 'Representative Translation', status: task.status === 'completed' ? 'finish' : 'process' }
    ];

    return (
      <Timeline style={{ marginBottom: 16 }}>
        {phases.map((phase, index) => (
          <Timeline.Item 
            key={index}
            color={phase.status === 'finish' ? '#52c41a' : '#1890ff'}
            dot={phase.status === 'finish' ? <CheckCircleOutlined /> : <LoadingOutlined />}
          >
            <Text strong={phase.status === 'process'}>{phase.title}</Text>
          </Timeline.Item>
        ))}
      </Timeline>
    );
  };

  return (
    <div style={{ 
      display: 'flex', 
      justifyContent: 'center', 
      alignItems: 'flex-start',
      minHeight: '60vh',
      padding: 24
    }}>
      <div style={{ width: '100%', maxWidth: 1200 }}>
        <Row gutter={24}>
          {/* Main Progress Card */}
          <Col span={16}>
            <Card 
              style={{ 
                textAlign: 'center',
                boxShadow: '0 4px 12px rgba(0,0,0,0.1)',
                marginBottom: 16
              }}
            >
              <div style={{ padding: '24px' }}>
                <div style={{ marginBottom: 24 }}>
                  {getPhaseIcon(task.current_phase)}
                  <Title level={3} style={{ margin: '16px 0 8px 0' }}>
                    Cluster Preprocessing
                  </Title>
                  
                  {task.current_phase && (
                    <Text type="secondary" style={{ fontSize: 16, display: 'block', marginBottom: 16 }}>
                      {task.current_phase}
                    </Text>
                  )}
                </div>
                
                {/* Main Progress Bar */}
                <div style={{ marginBottom: 24 }}>
                  <Progress 
                    percent={Math.round(animatedProgress)}
                    strokeColor={{
                      '0%': '#722ed1',
                      '50%': '#13c2c2',
                      '100%': '#52c41a'
                    }}
                    size="default"
                    style={{ marginBottom: 8 }}
                  />
                  
                  {/* Phase Progress Bar */}
                  {task.phase_progress !== undefined && (
                    <Progress 
                      percent={Math.round(animatedPhaseProgress)}
                      strokeColor="#1890ff"
                      size="small"
                      format={() => `Phase: ${Math.round(animatedPhaseProgress)}%`}
                    />
                  )}
                </div>
                
                {/* Statistics Grid */}
                <Row gutter={16}>
                  <Col span={6}>
                    <Statistic
                      title="Overall Progress"
                      value={task.progress || 0}
                      suffix="%"
                      valueStyle={{ color: getStatusColor() }}
                    />
                  </Col>
                  <Col span={6}>
                    <Statistic
                      title="Items Processed"
                      value={task.items_completed || 0}
                      suffix={`/ ${task.items_total || totalEntries}`}
                      valueStyle={{ color: getStatusColor() }}
                    />
                  </Col>
                  <Col span={6}>
                    <Statistic
                      title="Speed"
                      value={task.processing_speed || 0}
                      suffix="items/sec"
                      precision={1}
                      valueStyle={{ color: '#13c2c2' }}
                      prefix={<ThunderboltOutlined />}
                    />
                  </Col>
                  <Col span={6}>
                    <Statistic
                      title="ETA"
                      value={formatTime(task.estimated_time_remaining || 0)}
                      valueStyle={{ color: '#fa8c16' }}
                      prefix={<ClockCircleOutlined />}
                    />
                  </Col>
                </Row>
                
                {/* Current Item Display */}
                {task.current_item_text && (
                  <div style={{ 
                    marginTop: 24, 
                    padding: '16px',
                    backgroundColor: '#fafafa',
                    borderRadius: '8px',
                    border: '1px dashed #d9d9d9'
                  }}>
                    <Text type="secondary">Currently Processing:</Text>
                    <Paragraph 
                      ellipsis={{ rows: 2, expandable: true }}
                      style={{ margin: '8px 0 0 0', fontFamily: 'monospace' }}
                    >
                      {task.current_item_text}
                    </Paragraph>
                  </div>
                )}
              </div>
            </Card>
            
            {/* Cluster Statistics */}
            {renderClusterStats()}
            
            {/* Representative Translation Theater */}
            {renderCurrentRepresentative()}
          </Col>
          
          {/* Side Panel */}
          <Col span={8}>
            <Card 
              title="Process Timeline"
              size="small"
              style={{ marginBottom: 16 }}
            >
              {renderPhaseTimeline()}
            </Card>
            
            {/* Performance Metrics */}
            <Card 
              title="Performance Metrics"
              size="small"
            >
              <Space direction="vertical" style={{ width: '100%' }}>
                <Statistic
                  title="API Calls Made"
                  value={task.api_calls_made || 0}
                  valueStyle={{ fontSize: 16 }}
                />
                <Statistic
                  title="Tokens Used"
                  value={task.tokens_used || 0}
                  valueStyle={{ fontSize: 16 }}
                />
                {task.processing_time && (
                  <Statistic
                    title="Processing Time"
                    value={formatTime(Math.round(task.processing_time))}
                    valueStyle={{ fontSize: 16 }}
                  />
                )}
              </Space>
            </Card>
          </Col>
        </Row>
      </div>
    </div>
  );
};

export default ClusterPreprocessingProgress;