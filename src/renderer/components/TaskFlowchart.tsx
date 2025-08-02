import React from 'react';
import { Card, Progress, Typography, Button } from 'antd';
import { 
  FileTextOutlined,
  CheckCircleOutlined,
  ClearOutlined,
  RobotOutlined,
  DatabaseOutlined,
  SyncOutlined,
  CheckOutlined,
  BookOutlined,
  CloseOutlined
} from '@ant-design/icons';
import './TaskFlowchart.css';

const { Title, Text } = Typography;

interface FlowchartStep {
  id: string;
  name: string;
  icon: React.ReactNode;
  status: 'pending' | 'active' | 'completed';
  progress: number;
  description: string;
}

interface TaskFlowchartProps {
  taskName: string;
  fileName: string;
  currentPhase: string;
  currentItem?: string;
  progress: number;
  itemsCompleted?: number;
  itemsTotal?: number;
  processingSpeed?: number;
  estimatedTime?: number;
  taskType?: 'glossary_upload' | 'file_translation' | 'smart_translation';
  steps?: FlowchartStep[];
  onCancel?: () => void;
  showCancelButton?: boolean;
  errorMessage?: string;
  successMessage?: string;
}

const TaskFlowchart: React.FC<TaskFlowchartProps> = ({
  taskName,
  fileName,
  currentPhase,
  currentItem,
  progress,
  itemsCompleted,
  itemsTotal,
  processingSpeed,
  estimatedTime,
  taskType = 'glossary_upload',
  steps,
  onCancel,
  showCancelButton = true,
  errorMessage,
  successMessage
}) => {
  // Define the steps based on progress and task type
  const getSteps = (): FlowchartStep[] => {
    // If custom steps provided, use them
    if (steps) return steps;
    
    // Default steps for glossary upload
    if (taskType === 'glossary_upload') {
      // For glossary upload, first 3 steps are instant (0% progress)
      // Real progress starts at embedding work
      const isProcessingStarted = progress > 0;
      
      return [
        {
          id: 'read',
          name: 'File Read',
          icon: <FileTextOutlined />,
          status: isProcessingStarted ? 'completed' : 'active',
          progress: 100,
          description: `Reading ${fileName}`
        },
        {
          id: 'validate',
          name: 'Validation',
          icon: <CheckCircleOutlined />,
          status: isProcessingStarted ? 'completed' : 'pending',
          progress: 100,
          description: 'Validating entries'
        },
        {
          id: 'clean',
          name: 'Cleaning',
          icon: <ClearOutlined />,
          status: isProcessingStarted ? 'completed' : 'pending',
          progress: 100,
          description: 'Removing duplicates'
        },
        {
          id: 'model',
          name: 'AI Model',
          icon: <RobotOutlined />,
          status: progress > 20 ? 'completed' : progress > 0 ? 'active' : 'pending',
          progress: progress > 20 ? 100 : progress > 0 ? (progress / 20) * 100 : 0,
          description: 'Loading Qwen3 model'
        },
        {
          id: 'index',
          name: 'FAISS Index',
          icon: <DatabaseOutlined />,
          status: progress > 30 ? 'completed' : progress > 20 ? 'active' : 'pending',
          progress: progress > 30 ? 100 : progress > 20 ? ((progress - 20) / 10) * 100 : 0,
          description: 'Building search index'
        },
        {
          id: 'process',
          name: 'Processing',
          icon: <SyncOutlined />,
          status: progress >= 100 ? 'completed' : progress > 30 ? 'active' : 'pending',
          progress: progress >= 100 ? 100 : progress > 30 ? ((progress - 30) / 70) * 100 : 0,
          description: currentItem || 'Processing entries'
        }
      ];
    }
    
    // Steps for smart translation (13-phase dynamic glossary + translation)
    if (taskType === 'smart_translation') {
      return [
        {
          id: 'cluster',
          name: 'Clustering',
          icon: <DatabaseOutlined />,
          status: progress > 10 ? 'completed' : progress >= 0 ? 'active' : 'pending',
          progress: progress >= 10 ? 100 : progress >= 0 ? (progress / 10) * 100 : 0,
          description: 'Stage 1: Cluster preprocessing'
        },
        {
          id: 'char_2_3',
          name: '2-3 Chars',
          icon: <RobotOutlined />,
          status: progress > 25 ? 'completed' : progress >= 10 ? 'active' : 'pending',
          progress: progress >= 25 ? 100 : progress >= 10 ? ((progress - 10) / 15) * 100 : 0,
          description: 'Processing short candidates'
        },
        {
          id: 'char_4_6',
          name: '4-6 Chars',
          icon: <RobotOutlined />,
          status: progress > 40 ? 'completed' : progress >= 25 ? 'active' : 'pending',
          progress: progress >= 40 ? 100 : progress >= 25 ? ((progress - 25) / 15) * 100 : 0,
          description: 'Processing medium candidates'
        },
        {
          id: 'char_7_10',
          name: '7-10 Chars',
          icon: <RobotOutlined />,
          status: progress > 55 ? 'completed' : progress >= 40 ? 'active' : 'pending',
          progress: progress >= 55 ? 100 : progress >= 40 ? ((progress - 40) / 15) * 100 : 0,
          description: 'Processing longer candidates'
        },
        {
          id: 'char_long',
          name: 'Long Phrases',
          icon: <RobotOutlined />,
          status: progress > 70 ? 'completed' : progress >= 55 ? 'active' : 'pending',
          progress: progress >= 70 ? 100 : progress >= 55 ? ((progress - 55) / 15) * 100 : 0,
          description: 'Processing complex phrases'
        },
        {
          id: 'validation',
          name: 'Validation',
          icon: <CheckCircleOutlined />,
          status: progress >= 85 ? 'completed' : progress >= 70 ? 'active' : 'pending',
          progress: progress >= 85 ? 100 : progress >= 70 ? ((progress - 70) / 15) * 100 : 0,
          description: 'Final validation & FAISS refresh'
        },
        {
          id: 'translation',
          name: 'Translation',
          icon: <SyncOutlined />,
          status: progress >= 100 ? 'completed' : progress >= 85 ? 'active' : 'pending',
          progress: progress >= 100 ? 100 : progress >= 85 ? ((progress - 85) / 15) * 100 : 0,
          description: currentItem || 'Translating with dynamic glossary'
        }
      ];
    }
    
    // Steps for file translation
    if (taskType === 'file_translation') {
      const isProcessingStarted = progress > 0;
      
      return [
        {
          id: 'parse',
          name: 'Parse File',
          icon: <FileTextOutlined />,
          status: isProcessingStarted ? 'completed' : 'active',
          progress: 100,
          description: `Parsing ${fileName}`
        },
        {
          id: 'glossary',
          name: 'Load Glossary',
          icon: <BookOutlined />,
          status: isProcessingStarted ? 'completed' : 'pending',
          progress: 100,
          description: 'Loading glossaries'
        },
        {
          id: 'translate',
          name: 'Translation',
          icon: <RobotOutlined />,
          status: progress >= 100 ? 'completed' : progress > 0 ? 'active' : 'pending',
          progress: progress,
          description: currentItem || 'Translating entries'
        },
        {
          id: 'save',
          name: 'Save Results',
          icon: <CheckOutlined />,
          status: progress >= 100 ? 'completed' : 'pending',
          progress: progress >= 100 ? 100 : 0,
          description: 'Saving translation'
        }
      ];
    }
    
    // Default fallback steps (original behavior)
    return [
      {
        id: 'read',
        name: 'File Read',
        icon: <FileTextOutlined />,
        status: progress > 15 ? 'completed' : progress >= 0 ? 'active' : 'pending',
        progress: progress >= 15 ? 100 : progress >= 0 ? (progress / 15) * 100 : 0,
        description: `Reading ${fileName}`
      },
      {
        id: 'validate',
        name: 'Validation',
        icon: <CheckCircleOutlined />,
        status: progress > 25 ? 'completed' : progress >= 15 ? 'active' : 'pending',
        progress: progress >= 25 ? 100 : progress >= 15 ? ((progress - 15) / 10) * 100 : 0,
        description: 'Validating entries'
      },
      {
        id: 'clean',
        name: 'Cleaning',
        icon: <ClearOutlined />,
        status: progress > 35 ? 'completed' : progress >= 25 ? 'active' : 'pending',
        progress: progress >= 35 ? 100 : progress >= 25 ? ((progress - 25) / 10) * 100 : 0,
        description: 'Removing duplicates'
      },
      {
        id: 'model',
        name: 'AI Model',
        icon: <RobotOutlined />,
        status: progress > 55 ? 'completed' : progress >= 35 ? 'active' : 'pending',
        progress: progress >= 55 ? 100 : progress >= 35 ? ((progress - 35) / 20) * 100 : 0,
        description: 'Loading Qwen3 model'
      },
      {
        id: 'index',
        name: 'FAISS Index',
        icon: <DatabaseOutlined />,
        status: progress > 60 ? 'completed' : progress >= 55 ? 'active' : 'pending',
        progress: progress >= 60 ? 100 : progress >= 55 ? ((progress - 55) / 5) * 100 : 0,
        description: 'Building search index'
      },
      {
        id: 'process',
        name: 'Processing',
        icon: <SyncOutlined />,
        status: progress >= 100 ? 'completed' : progress >= 60 ? 'active' : 'pending',
        progress: progress >= 100 ? 100 : progress >= 60 ? ((progress - 60) / 40) * 100 : 0,
        description: currentItem || 'Processing entries'
      }
    ];
  };

  const computedSteps = getSteps();

  return (
    <Card className="flowchart-task-card">
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 16 }}>
        <Title level={4} style={{ margin: 0 }}>📚 {taskName}: {fileName}</Title>
        {/* Cancel Button - ALWAYS VISIBLE but disabled when not applicable */}
        <Button 
          type={showCancelButton && onCancel ? "primary" : "default"}
          danger={!!(showCancelButton && onCancel)}
          size="large"
          onClick={onCancel}
          disabled={!showCancelButton || !onCancel}
          icon={<CloseOutlined />}
          style={{ 
            minWidth: 140,
            height: 40,
            fontSize: 16,
            fontWeight: 600,
            boxShadow: showCancelButton && onCancel ? '0 2px 8px rgba(255, 77, 79, 0.3)' : 'none',
            opacity: showCancelButton && onCancel ? 1 : 0.5,
            cursor: showCancelButton && onCancel ? 'pointer' : 'not-allowed'
          }}
        >
          Cancel Task
        </Button>
      </div>
      
      <div className="flowchart-container">
        {computedSteps.map((step, idx) => (
          <div key={step.id} className="flowchart-step-wrapper">
            <div className={`flowchart-step ${step.status}`}>
              <div className="step-icon">
                {step.status === 'completed' ? <CheckOutlined /> : step.icon}
              </div>
              <div className="step-content">
                <Text strong>{step.name}</Text>
                <Progress 
                  percent={Math.round(step.progress)} 
                  size="small"
                  status={step.status === 'active' ? 'active' : step.status === 'completed' ? 'success' : 'normal'}
                  strokeColor={step.status === 'active' ? '#52c41a' : undefined}
                />
                <Text type="secondary" className="step-description">
                  {step.description}
                </Text>
              </div>
            </div>
          </div>
        ))}
      </div>
      
      <div className="overall-progress">
        <Text>Overall Progress</Text>
        <Progress 
          percent={Math.round(progress)} 
          status="active"
          strokeColor={{
            '0%': '#108ee9',
            '100%': '#87d068',
          }}
        />
        {/* ETA/Speed removed - calculations were inaccurate and misleading */}
        {itemsCompleted && itemsTotal && (
          <div className="progress-stats">
            <Text type="secondary">
              {itemsCompleted}/{itemsTotal} entries processed
            </Text>
          </div>
        )}
      </div>
      
      {/* Error Message */}
      {errorMessage && (
        <div style={{ 
          background: 'rgba(239, 68, 68, 0.1)', 
          border: '1px solid rgba(239, 68, 68, 0.3)',
          borderRadius: '8px',
          padding: '12px',
          marginTop: '16px'
        }}>
          <Text style={{ color: '#f87171', fontWeight: 500 }}>
            ❌ Error: {errorMessage}
          </Text>
        </div>
      )}
      
      {/* Success Message */}
      {successMessage && (
        <div style={{ 
          background: 'rgba(34, 197, 94, 0.1)', 
          border: '1px solid rgba(34, 197, 94, 0.3)',
          borderRadius: '8px',
          padding: '12px',
          marginTop: '16px'
        }}>
          <Text style={{ color: '#4ade80', fontWeight: 500 }}>
            ✅ {successMessage}
          </Text>
        </div>
      )}
    </Card>
  );
};

export default TaskFlowchart;