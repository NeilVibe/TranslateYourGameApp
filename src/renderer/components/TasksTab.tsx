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

  const handleCancelTask = async (taskId: string) => {
    try {
      await apiClient.cancelTask(taskId);
      notification.success({
        message: 'Task Cancelled',
        description: 'The task has been cancelled successfully.',
        placement: 'topRight'
      });
      // Refresh active tasks to show updated status
      await loadActiveTasks();
    } catch (error: any) {
      notification.error({
        message: 'Cancel Failed',
        description: error.message || 'Failed to cancel task',
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
    // Use TaskFlowchart for ALL tasks - consistent UI
    const taskTypeMapping: { [key: string]: string } = {
      'glossary_upload': 'Importing Game Glossary',
      'translate_file': 'Translating Game File',
      'translate_file_immediate': 'Translating Game File',
      'dynamic_glossary_workflow': 'Smart Translation + Dynamic Glossary',
      'dynamic_glossary_generation': 'Smart Translation - Dynamic Glossary Generation',
      'file_parsed': 'Parsing File',
      'generate_glossary': 'Generating Dynamic Glossary',
    };
    
    const taskName = taskTypeMapping[task.task_type] || getTaskTypeLabel(task.task_type);
    
    // Determine appropriate taskType for TaskFlowchart
    let taskType: 'glossary_upload' | 'file_translation' | 'smart_translation' | undefined;
    if (task.task_type === 'glossary_upload') {
      taskType = 'glossary_upload';
    } else if (task.task_type === 'translate_file' || task.task_type === 'translate_file_immediate') {
      taskType = 'file_translation';
    } else if (task.task_type === 'dynamic_glossary_workflow' || task.task_type === 'dynamic_glossary_generation') {
      taskType = 'smart_translation';
    }
    
    // Use TaskFlowchart for ALL tasks for consistency
    return (
      <div key={task.id} style={{ marginBottom: '20px' }}>
        <TaskFlowchart
          taskName={taskName}
          fileName={task.input_data?.original_filename || task.input_data?.filename || 'Processing'}
          currentPhase={task.current_phase || 'Processing'}
          currentItem={task.current_item_text}
          progress={task.progress || 0}
          itemsCompleted={task.items_completed}
          itemsTotal={task.items_total}
          processingSpeed={task.processing_speed}
          taskType={taskType}
          estimatedTime={task.estimated_time_remaining}
          onCancel={(task.status === 'processing' || task.status === 'pending') ? () => handleCancelTask(task.id) : undefined}
          showCancelButton={task.status === 'processing' || task.status === 'pending'}
          errorMessage={task.error_message}
          successMessage={task.status === 'completed' && task.result_data?.message}
        />
      </div>
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

      {/* Active Tasks - SINGLE MAIN CARD */}
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
          {/* Show only the MOST RECENT active task to prevent card duplication */}
          {renderActiveTask(activeTasks[0])}
          
          {/* If multiple tasks, show others as small status cards below */}
          {activeTasks.length > 1 && (
            <div style={{ marginTop: '16px' }}>
              <Text style={{ color: '#a0aec0', fontSize: '14px', marginBottom: '12px', display: 'block' }}>
                {activeTasks.length - 1} other task{activeTasks.length > 2 ? 's' : ''} running in background:
              </Text>
              {activeTasks.slice(1).map(task => (
                <Card 
                  key={task.id} 
                  size="small" 
                  style={{ 
                    marginBottom: '8px', 
                    background: 'rgba(255,255,255,0.05)',
                    border: '1px solid rgba(255,255,255,0.1)'
                  }}
                >
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                    <Text style={{ color: '#e2e8f0' }}>
                      {getTaskDisplayName(task)}
                    </Text>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
                      <Progress 
                        percent={Math.round(task.progress || 0)} 
                        size="small" 
                        style={{ minWidth: '100px' }}
                      />
                      {(task.status === 'processing' || task.status === 'pending') && (
                        <Button 
                          size="small" 
                          danger 
                          onClick={() => handleCancelTask(task.id)}
                        >
                          Cancel
                        </Button>
                      )}
                    </div>
                  </div>
                </Card>
              ))}
            </div>
          )}
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