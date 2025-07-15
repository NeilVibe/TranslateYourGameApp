import React from 'react';
import { Progress, Typography } from 'antd';

const { Text } = Typography;

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
        padding: '40px',
        textAlign: 'center',
        color: '#666'
      }}>
        Initializing...
      </div>
    );
  }

  const progress = task.progress || 0;
  const itemsCompleted = task.items_completed || 0;
  const currentPhase = task.current_phase || 'processing';
  const estimatedRemaining = task.estimated_remaining;
  const processingTime = task.processing_time;
  const currentItem = task.current_item;

  const formatTime = (seconds: number) => {
    if (seconds < 60) return `${seconds}s`;
    const minutes = Math.floor(seconds / 60);
    const remainingSeconds = seconds % 60;
    return `${minutes}m ${remainingSeconds}s`;
  };

  const getPhaseDisplay = (phase: string) => {
    const phases: { [key: string]: string } = {
      'parsing': 'Parsing file',
      'preprocessing': 'Preparing entries', 
      'translating': 'Translating',
      'postprocessing': 'Finalizing',
      'completed': 'Complete'
    };
    return phases[phase] || phase;
  };

  return (
    <div style={{
      padding: '32px',
      background: '#0a0a0a',
      color: '#e2e8f0',
      minHeight: '400px'
    }}>
      
      {/* Current Status */}
      <div style={{ marginBottom: '24px' }}>
        <Text style={{ 
          fontSize: '18px', 
          color: '#e2e8f0',
          fontWeight: 500
        }}>
          {getPhaseDisplay(currentPhase)}
        </Text>
      </div>

      {/* Progress Bar */}
      <div style={{ marginBottom: '24px' }}>
        <Progress
          percent={Math.round(progress)}
          strokeColor={{
            '0%': '#8b5cf6',
            '100%': '#06b6d4',
          }}
          trailColor="#1a1a1a"
          strokeWidth={8}
          showInfo={false}
        />
      </div>

      {/* Key Metrics */}
      <div style={{ 
        display: 'grid', 
        gridTemplateColumns: 'repeat(auto-fit, minmax(120px, 1fr))',
        gap: '16px',
        marginBottom: '24px'
      }}>
        <div>
          <Text style={{ color: '#888', fontSize: '13px', display: 'block' }}>
            Progress
          </Text>
          <Text style={{ color: '#e2e8f0', fontSize: '20px', fontWeight: 600 }}>
            {Math.round(progress)}%
          </Text>
        </div>
        
        <div>
          <Text style={{ color: '#888', fontSize: '13px', display: 'block' }}>
            Items
          </Text>
          <Text style={{ color: '#e2e8f0', fontSize: '20px', fontWeight: 600 }}>
            {itemsCompleted}/{totalEntries}
          </Text>
        </div>

        {processingTime && (
          <div>
            <Text style={{ color: '#888', fontSize: '13px', display: 'block' }}>
              Elapsed
            </Text>
            <Text style={{ color: '#e2e8f0', fontSize: '20px', fontWeight: 600 }}>
              {formatTime(Math.round(processingTime))}
            </Text>
          </div>
        )}

        {estimatedRemaining && task.status === 'processing' && (
          <div>
            <Text style={{ color: '#888', fontSize: '13px', display: 'block' }}>
              Remaining
            </Text>
            <Text style={{ color: '#e2e8f0', fontSize: '20px', fontWeight: 600 }}>
              {formatTime(Math.round(estimatedRemaining))}
            </Text>
          </div>
        )}
      </div>

      {/* Current Item */}
      {currentItem && task.status === 'processing' && (
        <div style={{
          background: '#1a1a1a',
          padding: '16px',
          borderRadius: '6px',
          border: '1px solid #333'
        }}>
          <Text style={{ color: '#888', fontSize: '13px', display: 'block', marginBottom: '4px' }}>
            Current:
          </Text>
          <Text style={{ 
            color: '#e2e8f0', 
            fontSize: '14px',
            wordBreak: 'break-word'
          }}>
            {currentItem.length > 100 ? `${currentItem.slice(0, 100)}...` : currentItem}
          </Text>
        </div>
      )}

      {/* Error State */}
      {task.status === 'failed' && task.error_message && (
        <div style={{
          background: '#2d1b1b',
          padding: '16px',
          borderRadius: '6px',
          border: '1px solid #dc2626',
          marginTop: '16px'
        }}>
          <Text style={{ color: '#dc2626', fontSize: '14px' }}>
            Error: {task.error_message}
          </Text>
        </div>
      )}
    </div>
  );
};

export default TranslationProgress;