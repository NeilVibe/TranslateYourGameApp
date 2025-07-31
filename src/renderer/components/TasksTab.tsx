import React, { useState, useEffect } from 'react';
import { 
  Card, 
  Progress, 
  Typography, 
  Space,
  Button,
  Modal,
  Table,
  Empty,
  Spin,
  Tag,
  Tooltip,
  notification
} from 'antd';
import { 
  PlayCircleOutlined, 
  CheckCircleOutlined,
  ExclamationCircleOutlined,
  ClockCircleOutlined,
  HistoryOutlined,
  DeleteOutlined,
  FileTextOutlined,
  BookOutlined,
  LoadingOutlined
} from '@ant-design/icons';
import { useTranslation } from 'react-i18next';
import apiClient from '../services/apiClient';
import TaskFlowchart from './TaskFlowchart';

const { Title, Text, Paragraph } = Typography;

interface Task {
  id: string;
  status: 'pending' | 'processing' | 'completed' | 'failed' | 'parsed';
  task_type: string;
  progress: number;
  error_message?: string;
  created_at: string;
  started_at?: string;
  completed_at?: string;
  result_data?: any;
  items_completed?: number;
  items_total?: number;
  current_phase?: string;
  current_item_text?: string;
  processing_time?: number;
  processing_speed?: number;
  estimated_time_remaining?: number;
  input_data?: {
    original_filename?: string;
    glossary_id?: number;
    [key: string]: any;
  };
}

interface TasksTabProps {
  apiKey: string;
}

const TasksTab: React.FC<TasksTabProps> = ({ apiKey }) => {
  const { t } = useTranslation(['tasks', 'common']);
  
  const [activeTasks, setActiveTasks] = useState<Task[]>([]);
  const [taskHistory, setTaskHistory] = useState<Task[]>([]);
  const [loading, setLoading] = useState(true);
  const [historyModalVisible, setHistoryModalVisible] = useState(false);

  // Auto-refresh active tasks every 2 seconds
  useEffect(() => {
    if (!apiKey) return;
    
    loadActiveTasks();
    
    const interval = setInterval(() => {
      loadActiveTasks();
    }, 2000);
    
    return () => clearInterval(interval);
  }, [apiKey]);

  const loadActiveTasks = async () => {
    try {
      const response = await apiClient.getActiveTasks();
      setActiveTasks(response.data.active_tasks || []);
      if (loading) setLoading(false);
    } catch (error) {
      console.error('Error loading active tasks:', error);
      if (loading) setLoading(false);
    }
  };

  const loadTaskHistory = async () => {
    try {
      const response = await apiClient.getTaskHistory({ hours: 24 });
      setTaskHistory(response.data.history || []);
    } catch (error) {
      console.error('Error loading task history:', error);
    }
  };

  const handleShowHistory = async () => {
    await loadTaskHistory();
    setHistoryModalVisible(true);
  };

  const handleClearHistory = async () => {
    try {
      await apiClient.cleanFinishedTasks();
      notification.success({
        message: 'History Cleared',
        description: 'All completed and failed tasks have been removed.',
        placement: 'topRight'
      });
      await loadTaskHistory();
    } catch (error: any) {
      notification.error({
        message: 'Clear Failed',
        description: error.message || 'Failed to clean task history',
        placement: 'topRight'
      });
    }
  };

  const getTaskTypeIcon = (taskType: string) => {
    switch (taskType) {
      case 'file_parsed':
      case 'translate_file_immediate':
      case 'translate_file':
        return <FileTextOutlined />;
      case 'generate_glossary':
        return <BookOutlined />;
      case 'glossary_upload':
        return <BookOutlined />;
      default:
        return <PlayCircleOutlined />;
    }
  };

  const getTaskTypeLabel = (taskType: string) => {
    switch (taskType) {
      case 'file_parsed':
        return 'File Parsing';
      case 'translate_file_immediate':
      case 'translate_file':
        return 'File Translation';
      case 'generate_glossary':
        return 'Glossary Generation';
      case 'glossary_upload':
        return 'Glossary Upload';
      default:
        return taskType.replace(/_/g, ' ').replace(/\b\w/g, l => l.toUpperCase());
    }
  };

  const getTaskDisplayName = (task: Task) => {
    const fileName = task.input_data?.original_filename;
    const icon = getTaskTypeIcon(task.task_type);
    
    if (fileName) {
      switch (task.task_type) {
        case 'glossary_upload':
          return `📚 Importing ${fileName}`;
        case 'translate_file_immediate':
        case 'translate_file':
          return `🌐 Translating ${fileName}`;
        case 'generate_glossary':
          return `🧠 Generating Glossary from ${fileName}`;
        default:
          return `📄 Processing ${fileName}`;
      }
    }
    
    // Fallback to generic names
    return getTaskTypeLabel(task.task_type);
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'completed': return '#52c41a';
      case 'failed': return '#ff4d4f';
      case 'processing': return '#1890ff';
      case 'pending': return '#faad14';
      case 'parsed': return '#722ed1';
      default: return '#d9d9d9';
    }
  };

  const formatDuration = (seconds: number) => {
    if (seconds < 60) return `${Math.round(seconds)}s`;
    const minutes = Math.floor(seconds / 60);
    const remainingSeconds = Math.round(seconds % 60);
    return `${minutes}m ${remainingSeconds}s`;
  };

  const renderActiveTask = (task: Task) => {
    // Use TaskFlowchart for glossary upload tasks
    if (task.task_type === 'glossary_upload') {
      return (
        <div key={task.id} style={{ marginBottom: '20px' }}>
          <TaskFlowchart
            taskName="Importing Game Glossary"
            fileName={task.input_data?.original_filename || task.input_data?.filename || 'file'}
            currentPhase={task.current_phase || 'Processing'}
            currentItem={task.current_item_text}
            progress={task.progress || 0}
            itemsCompleted={task.items_completed}
            itemsTotal={task.items_total}
            processingSpeed={task.processing_speed}
            estimatedTime={task.estimated_time_remaining}
            taskType="glossary_upload"
          />
        </div>
      );
    }
    
    // Use TaskFlowchart for file translation tasks
    if (task.task_type === 'translate_file' || task.task_type === 'translate_file_immediate') {
      return (
        <div key={task.id} style={{ marginBottom: '20px' }}>
          <TaskFlowchart
            taskName="Translating Game File"
            fileName={task.input_data?.original_filename || task.input_data?.filename || 'file'}
            currentPhase={task.current_phase || 'Processing'}
            currentItem={task.current_item_text}
            progress={task.progress || 0}
            itemsCompleted={task.items_completed}
            itemsTotal={task.items_total}
            processingSpeed={task.processing_speed}
            estimatedTime={task.estimated_time_remaining}
            taskType="file_translation"
          />
        </div>
      );
    }

    // Use TaskFlowchart for smart translation with dynamic glossary
    if (task.task_type === 'dynamic_glossary_workflow') {
      return (
        <div key={task.id} style={{ marginBottom: '20px' }}>
          <TaskFlowchart
            taskName="Smart Translation + Dynamic Glossary"
            fileName={task.input_data?.original_filename || task.input_data?.filename || 'file'}
            currentPhase={task.current_phase || 'Processing'}
            currentItem={task.current_item_text}
            progress={task.progress || 0}
            itemsCompleted={task.items_completed}
            itemsTotal={task.items_total}
            processingSpeed={task.processing_speed}
            estimatedTime={task.estimated_time_remaining}
            taskType="file_translation"
          />
        </div>
      );
    }

    // Use regular card for other task types
    return (
      <Card
        key={task.id}
        style={{
          marginBottom: '20px',
          borderLeft: `4px solid ${getStatusColor(task.status)}`,
          background: 'linear-gradient(135deg, #16213e 0%, #1e2749 100%)',
          borderRadius: '12px',
          boxShadow: '0 4px 12px rgba(0, 0, 0, 0.15)'
        }}
        bodyStyle={{ padding: '24px' }}
      >
      <div style={{ display: 'flex', alignItems: 'flex-start', gap: '20px' }}>
        {/* Task Icon */}
        <div style={{ 
          fontSize: '32px', 
          color: getStatusColor(task.status),
          marginTop: '4px',
          minWidth: '32px'
        }}>
          {task.status === 'processing' ? (
            <LoadingOutlined spin />
          ) : (
            getTaskTypeIcon(task.task_type)
          )}
        </div>

        {/* Task Content */}
        <div style={{ flex: 1, minWidth: 0 }}>
          {/* Task Title */}
          <div style={{ marginBottom: '16px' }}>
            <Title level={3} style={{ 
              margin: 0, 
              color: '#e2e8f0',
              fontSize: '20px',
              fontWeight: 600
            }}>
              {getTaskDisplayName(task)}
            </Title>
            {task.input_data?.original_filename && (
              <Text style={{ color: '#8b5cf6', fontSize: '14px', display: 'block', marginTop: '4px' }}>
                File: {task.input_data.original_filename}
              </Text>
            )}
          </div>

          {/* Progress Bar with Better Styling */}
          <div style={{ marginBottom: '16px' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '8px' }}>
              <Text style={{ color: '#a0aec0', fontSize: '14px', fontWeight: 500 }}>
                Progress: {Math.round(task.progress)}% complete
              </Text>
              {task.processing_speed && task.processing_speed > 0 && (
                <Text style={{ color: '#10b981', fontSize: '14px' }}>
                  {task.processing_speed.toFixed(1)} items/sec
                </Text>
              )}
            </div>
            <Progress
              percent={Math.round(task.progress)}
              strokeColor={{
                '0%': getStatusColor(task.status),
                '100%': '#8b5cf6',
              }}
              trailColor="#2d3748"
              strokeWidth={8}
              showInfo={false}
            />
          </div>

          {/* Current Activity - THE KEY FIX! */}
          {task.current_item_text && (
            <div style={{ 
              background: 'rgba(139, 92, 246, 0.1)', 
              border: '1px solid rgba(139, 92, 246, 0.3)',
              borderRadius: '8px',
              padding: '12px',
              marginBottom: '16px'
            }}>
              <Text style={{ color: '#c4b5fd', fontWeight: 500, fontSize: '14px' }}>
                Current: {task.current_item_text}
              </Text>
            </div>
          )}

          {/* Task Statistics */}
          <div style={{ 
            display: 'grid', 
            gridTemplateColumns: 'repeat(auto-fit, minmax(140px, 1fr))', 
            gap: '12px',
            marginBottom: '12px'
          }}>
            {/* Items Progress - FIXED LOGIC */}
            {task.items_total && task.items_total > 0 && (
              <div style={{ textAlign: 'center', padding: '8px', background: 'rgba(0, 0, 0, 0.2)', borderRadius: '6px' }}>
                <Text style={{ color: '#f3f4f6', fontSize: '16px', fontWeight: 600, display: 'block' }}>
                  {task.items_completed || 0} / {task.items_total}
                </Text>
                <Text style={{ color: '#9ca3af', fontSize: '12px' }}>
                  Items Processed
                </Text>
              </div>
            )}

            {/* Processing Speed */}
            {task.processing_speed && task.processing_speed > 0 && (
              <div style={{ textAlign: 'center', padding: '8px', background: 'rgba(0, 0, 0, 0.2)', borderRadius: '6px' }}>
                <Text style={{ color: '#10b981', fontSize: '16px', fontWeight: 600, display: 'block' }}>
                  {task.processing_speed.toFixed(1)}/sec
                </Text>
                <Text style={{ color: '#9ca3af', fontSize: '12px' }}>
                  Processing Speed
                </Text>
              </div>
            )}

            {/* ETA */}
            {task.estimated_time_remaining && task.estimated_time_remaining > 0 && (
              <div style={{ textAlign: 'center', padding: '8px', background: 'rgba(0, 0, 0, 0.2)', borderRadius: '6px' }}>
                <Text style={{ color: '#fbbf24', fontSize: '16px', fontWeight: 600, display: 'block' }}>
                  {formatDuration(task.estimated_time_remaining)}
                </Text>
                <Text style={{ color: '#9ca3af', fontSize: '12px' }}>
                  ETA
                </Text>
              </div>
            )}

            {/* Duration */}
            {task.processing_time && (
              <div style={{ textAlign: 'center', padding: '8px', background: 'rgba(0, 0, 0, 0.2)', borderRadius: '6px' }}>
                <Text style={{ color: '#a0aec0', fontSize: '16px', fontWeight: 600, display: 'block' }}>
                  {formatDuration(task.processing_time)}
                </Text>
                <Text style={{ color: '#9ca3af', fontSize: '12px' }}>
                  Duration
                </Text>
              </div>
            )}
          </div>

          {/* Phase Information */}
          {task.current_phase && (
            <div style={{ marginTop: '12px' }}>
              <Text style={{ color: '#8b5cf6', fontSize: '14px', fontWeight: 500 }}>
                📍 Phase: {task.current_phase}
              </Text>
            </div>
          )}

          {/* Error Message */}
          {task.error_message && (
            <div style={{ 
              background: 'rgba(239, 68, 68, 0.1)', 
              border: '1px solid rgba(239, 68, 68, 0.3)',
              borderRadius: '8px',
              padding: '12px',
              marginTop: '12px'
            }}>
              <Text style={{ color: '#f87171', fontWeight: 500 }}>
                ❌ Error: {task.error_message}
              </Text>
            </div>
          )}

          {/* Success Message */}
          {task.status === 'completed' && task.result_data?.message && (
            <div style={{ 
              background: 'rgba(34, 197, 94, 0.1)', 
              border: '1px solid rgba(34, 197, 94, 0.3)',
              borderRadius: '8px',
              padding: '12px',
              marginTop: '12px'
            }}>
              <Text style={{ color: '#4ade80', fontWeight: 500 }}>
                ✅ {task.result_data.message}
              </Text>
            </div>
          )}
        </div>
      </div>
    </Card>
    );
  };

  const historyColumns = [
    {
      title: 'Type',
      dataIndex: 'task_type',
      key: 'task_type',
      width: 150,
      render: (type: string) => (
        <Space>
          {getTaskTypeIcon(type)}
          <span>{getTaskTypeLabel(type)}</span>
        </Space>
      )
    },
    {
      title: 'Status',
      dataIndex: 'status',
      key: 'status',
      width: 100,
      render: (status: string) => (
        <Tag color={getStatusColor(status)}>
          {status.toUpperCase()}
        </Tag>
      )
    },
    {
      title: 'Progress',
      dataIndex: 'progress',
      key: 'progress',
      width: 100,
      render: (progress: number) => `${Math.round(progress)}%`
    },
    {
      title: 'Created',
      dataIndex: 'created_at',
      key: 'created_at',
      width: 160,
      render: (date: string) => new Date(date).toLocaleString()
    },
    {
      title: 'Duration',
      dataIndex: 'processing_time',
      key: 'processing_time',
      width: 100,
      render: (time: number) => time ? formatDuration(time) : '-'
    }
  ];

  if (loading) {
    return (
      <div style={{ 
        display: 'flex', 
        justifyContent: 'center', 
        alignItems: 'center', 
        height: '400px',
        flexDirection: 'column',
        gap: '16px'
      }}>
        <Spin size="large" />
        <Text style={{ color: '#a0aec0' }}>Loading your tasks...</Text>
      </div>
    );
  }

  return (
    <div style={{ padding: '24px', maxWidth: '800px', margin: '0 auto' }}>
      {/* Clean Header */}
      <div style={{ 
        marginBottom: '32px', 
        display: 'flex', 
        justifyContent: 'space-between', 
        alignItems: 'center' 
      }}>
        <Title level={2} style={{ margin: 0, color: '#e2e8f0' }}>
          Tasks
        </Title>
        <Button 
          icon={<HistoryOutlined />} 
          onClick={handleShowHistory}
          type="text"
          style={{ color: '#8b5cf6' }}
        >
          History
        </Button>
      </div>

      {/* Active Tasks */}
      {activeTasks.length === 0 ? (
        <Card style={{ textAlign: 'center', padding: '40px' }}>
          <Empty 
            description={
              <span style={{ color: '#a0aec0' }}>
                No active tasks
                <br />
                <Text type="secondary" style={{ fontSize: '14px' }}>
                  Start a file translation or glossary upload to see progress here
                </Text>
              </span>
            }
            image={Empty.PRESENTED_IMAGE_SIMPLE}
          />
        </Card>
      ) : (
        <div>
          {activeTasks.map(renderActiveTask)}
        </div>
      )}

      {/* History Modal */}
      <Modal
        title={
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
            <span>Task History</span>
            <Button 
              icon={<DeleteOutlined />} 
              onClick={handleClearHistory}
              type="text"
              danger
              size="small"
            >
              Clear History
            </Button>
          </div>
        }
        open={historyModalVisible}
        onCancel={() => setHistoryModalVisible(false)}
        footer={null}
        width={900}
        styles={{
          body: { padding: '20px' }
        }}
      >
        {taskHistory.length === 0 ? (
          <Empty 
            description="No task history"
            image={Empty.PRESENTED_IMAGE_SIMPLE}
          />
        ) : (
          <Table
            dataSource={taskHistory}
            columns={historyColumns}
            rowKey="id"
            pagination={{
              pageSize: 10,
              showSizeChanger: false,
              showQuickJumper: true,
              showTotal: (total, range) => `${range[0]}-${range[1]} of ${total} tasks`
            }}
            size="small"
          />
        )}
      </Modal>
    </div>
  );
};

export default TasksTab;