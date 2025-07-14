import React, { useState, useEffect, useMemo } from 'react';
import { 
  Card, 
  Button, 
  Typography, 
  Progress, 
  Space, 
  Tag, 
  Row, 
  Col, 
  Divider, 
  Badge,
  Table,
  Input,
  Segmented,
  Skeleton,
  Empty,
  Tooltip,
  notification
} from 'antd';
import { 
  FileTextOutlined, 
  CloudUploadOutlined, 
  CheckCircleOutlined, 
  SyncOutlined,
  ClockCircleOutlined,
  GlobalOutlined,
  ThunderboltOutlined,
  EditOutlined,
  EyeOutlined,
  SaveOutlined,
  DownloadOutlined,
  SearchOutlined,
  FilterOutlined,
  BookOutlined,
  RocketOutlined
} from '@ant-design/icons';
import apiClient, { TaskResponse } from '../services/apiClient';
import LanguageSelector from './LanguageSelector';
import GlossarySelector from './GlossarySelector';

const { Title, Text } = Typography;
const { Search } = Input;

interface ProfessionalFileTranslationProps {
  selectedGlossaries: number[];
  onSelectedGlossariesChange: (ids: number[]) => void;
  sourceLanguage: string;
  targetLanguage: string;
  onSourceLanguageChange: (lang: string) => void;
  onTargetLanguageChange: (lang: string) => void;
  apiKey: string | null;
}

interface TranslationSegment {
  id: string;
  source: string;
  target?: string;
  status: 'pending' | 'translating' | 'translated' | 'approved' | 'error';
  metadata?: any;
  confidence?: number;
}

type ViewMode = 'editor' | 'preview' | 'review';
type TranslationMode = 'simple' | 'smart';

const ProfessionalFileTranslation: React.FC<ProfessionalFileTranslationProps> = ({
  selectedGlossaries,
  onSelectedGlossariesChange,
  sourceLanguage,
  targetLanguage,
  onSourceLanguageChange,
  onTargetLanguageChange,
  apiKey
}) => {
  const [fileInfo, setFileInfo] = useState<any>(null);
  const [segments, setSegments] = useState<TranslationSegment[]>([]);
  const [viewMode, setViewMode] = useState<ViewMode>('editor');
  const [translationMode, setTranslationMode] = useState<TranslationMode>('simple');
  const [useGlossaries, setUseGlossaries] = useState<boolean>(false);
  const [isTranslating, setIsTranslating] = useState(false);
  const [currentTask, setCurrentTask] = useState<TaskResponse | null>(null);
  const [searchText, setSearchText] = useState('');
  const [selectedSegment, setSelectedSegment] = useState<string | null>(null);

  const languages = [
    { code: 'en', name: 'English' },
    { code: 'ko', name: '한국어' },
    { code: 'ja', name: '日本語' },
    { code: 'fr', name: 'Français' },
    { code: 'es', name: 'Español' },
    { code: 'de', name: 'Deutsch' },
    { code: 'it', name: 'Italiano' },
    { code: 'pt', name: 'Português' },
    { code: 'ru', name: 'Русский' },
    { code: 'zh', name: '中文' }
  ];

  const handleFileSelect = async () => {
    // Create hidden file input for real file upload
    const fileInput = document.createElement('input');
    fileInput.type = 'file';
    fileInput.accept = '.xlsx,.csv,.json,.xml,.po,.pot';
    fileInput.style.display = 'none';
    
    fileInput.onchange = async (event) => {
      const file = (event.target as HTMLInputElement).files?.[0];
      if (!file) return;
      
      try {
        // Set initial file info
        setFileInfo({
          name: file.name,
          size: file.size,
          format: file.name.split('.').pop()?.toUpperCase() || 'UNKNOWN',
          entries: 0 // Will be updated after parsing
        });
        
        // Parse file only - do NOT start translation yet
        const response = await apiClient.parseFileOnly(
          file, 
          sourceLanguage, 
          targetLanguage
        );
        
        if (response.status === 'success') {
          const taskId = response.data.task_id;
          const preview = response.data.preview || [];
          
          console.log('📁 FILE UPLOAD SUCCESS:', {
            taskId,
            filename: response.data.filename,
            entriesFound: response.data.entries_found,
            preview
          });
          
          // Update file info with real data
          setFileInfo((prev: any) => ({
            ...prev,
            entries: response.data.entries_found
          }));
          
          // Convert preview to segments format
          const previewSegments: TranslationSegment[] = preview.map((entry: any, index: number) => ({
            id: `preview_${index}`,
            source: entry.source,
            status: 'pending' as const,
            metadata: entry.metadata
          }));
          
          setSegments(previewSegments);
          // Store parsed file data but don't start translation
          setCurrentTask({ task_id: taskId, status: 'parsed', progress: 0 });
          
          notification.success({
            message: 'File Parsed Successfully',
            description: `Found ${response.data.entries_found} entries. Ready to configure translation settings.`,
            duration: 4
          });
          
        } else {
          throw new Error(response.message || 'Upload failed');
        }
        
      } catch (error: any) {
        console.error('❌ FILE UPLOAD ERROR:', error);
        notification.error({
          message: 'File Upload Failed',
          description: error.message || 'Failed to upload and process file',
          duration: 6
        });
        setFileInfo(null);
        setSegments([]);
      }
    };
    
    // Trigger file selection
    document.body.appendChild(fileInput);
    fileInput.click();
    document.body.removeChild(fileInput);
  };

  const handleStartTranslation = async () => {
    if (!fileInfo || !apiKey) {
      notification.warning({
        message: 'No File Uploaded',
        description: 'Please upload a file first before starting translation.',
        duration: 4
      });
      return;
    }
    
    setIsTranslating(true);
    notification.info({
      message: 'Translation Started',
      description: 'Creating new translation task with current settings...',
      duration: 3
    });
    
    try {
      // Start new translation with current user settings
      const response = await apiClient.startTranslationFromParsedFile(
        currentTask?.task_id,
        sourceLanguage,
        targetLanguage,
        translationMode,  // 'simple' or 'smart'
        useGlossaries,    // Boolean toggle
        selectedGlossaries // List of selected glossaries (when enabled)
      );
      
      if (response.status === 'success') {
        const newTaskId = response.data.task_id;
        setCurrentTask({ task_id: newTaskId, status: 'queued', progress: 0 });
        
        // Start polling the new task
        pollTaskStatus(newTaskId);
      } else {
        throw new Error(response.message || 'Failed to start translation');
      }
    } catch (error: any) {
      console.error('❌ TRANSLATION START ERROR:', error);
      setIsTranslating(false);
      notification.error({
        message: 'Translation Start Failed',
        description: error.message || 'Failed to create translation task',
        duration: 6
      });
    }
  };
  
  // Separate polling function
  const pollTaskStatus = async (taskId: string) => {
    try {
      const taskStatus = await apiClient.getTaskStatus(taskId);
        
        // Enhanced task status with detailed progress tracking
        const enhancedTask: TaskResponse = {
          ...taskStatus,
          processing_time: Date.now() - (currentTask?.started_at || Date.now()),
          estimated_remaining: taskStatus.items_completed && taskStatus.total_items ? 
            ((taskStatus.total_items - taskStatus.items_completed) * 2500) : undefined // 2.5s per item estimate
        };
        
        setCurrentTask(enhancedTask);
        
        console.log('📊 DETAILED TASK STATUS:', {
          taskId: taskId,
          status: taskStatus.status,
          progress: taskStatus.progress,
          phase: taskStatus.current_phase,
          completed: taskStatus.items_completed,
          total: taskStatus.total_items,
          currentItem: taskStatus.current_item,
          processingTime: enhancedTask.processing_time,
          estimatedRemaining: enhancedTask.estimated_remaining
        });
        
        if (taskStatus.status === 'completed') {
          setIsTranslating(false);
          notification.success({
            message: 'Translation Complete',
            description: `Successfully translated ${taskStatus.items_completed || 0} segments.`,
            duration: 4
          });
          
          // Get the final results
          try {
            const results = await apiClient.getTaskResult(taskId);
            if (results && results.translated_entries) {
              // Update segments with real translations
              setSegments(prev => prev.map((seg, index) => {
                const translation = results.translated_entries[index];
                return {
                  ...seg,
                  status: 'translated' as const,
                  target: translation?.target || seg.source,
                  confidence: 85
                };
              }));
            }
          } catch (resultError) {
            console.error('❌ Failed to fetch results:', resultError);
          }
          
        } else if (taskStatus.status === 'failed') {
          setIsTranslating(false);
          notification.error({
            message: 'Translation Failed',
            description: taskStatus.error_message || 'Translation task failed.',
            duration: 6
          });
          
        } else if (taskStatus.status === 'processing' || taskStatus.status === 'queued') {
          // Continue polling every 2 seconds for real-time updates
          setTimeout(() => pollTaskStatus(taskId), 2000);
        }
        
    } catch (error: any) {
      console.error('❌ TASK POLLING ERROR:', error);
      setIsTranslating(false);
      notification.error({
        message: 'Translation Error',
        description: 'Failed to check translation progress.',
        duration: 6
      });
    }
  };

  const handleExportFile = async () => {
    console.log('🔍 EXPORT DEBUG:', {
      currentTask: currentTask,
      taskId: currentTask?.task_id,
      status: currentTask?.status,
      fileInfo: fileInfo
    });

    if (!currentTask) {
      notification.warning({
        message: 'Export Not Available',
        description: 'No translation task found. Please translate a file first.',
        duration: 4
      });
      return;
    }

    if (!currentTask.task_id) {
      notification.error({
        message: 'Export Error',
        description: 'Task ID is missing. Cannot download file.',
        duration: 4
      });
      return;
    }

    if (currentTask.status !== 'completed') {
      notification.warning({
        message: 'Export Not Available',
        description: `Translation not complete (status: ${currentTask.status}). Please wait for completion.`,
        duration: 4
      });
      return;
    }
    
    try {
      notification.info({
        message: 'Preparing Download',
        description: 'Generating your translated file...',
        duration: 2
      });
      
      console.log('📥 STARTING DOWNLOAD:', {
        taskId: currentTask.task_id,
        filename: fileInfo?.name
      });
      
      const result = await apiClient.downloadTranslationFile(
        currentTask.task_id, 
        fileInfo?.name
      );
      
      if (result.success) {
        notification.success({
          message: 'File Downloaded',
          description: `Successfully downloaded ${result.filename}`,
          duration: 4
        });
      }
      
    } catch (error: any) {
      console.error('❌ EXPORT ERROR:', error);
      notification.error({
        message: 'Export Failed',
        description: error.message || 'Failed to download translated file',
        duration: 6
      });
    }
  };

  const getStatusColor = (status: string) => {
    const colors: Record<string, string> = {
      pending: 'default',
      translating: 'processing',
      translated: 'success',
      approved: 'green',
      error: 'error'
    };
    return colors[status] || 'default';
  };

  const getLanguageDisplay = (code: string) => {
    const lang = languages.find(l => l.code === code);
    return lang ? lang.name : code.toUpperCase();
  };

  const getPhaseDescription = (progress: number, mode: TranslationMode) => {
    if (!progress || progress === 0) return "Phase 1: Initializing Translation";
    if (progress < 20) return "Phase 1: File Upload & Parsing";
    
    if (mode === 'smart') {
      if (progress < 50) return "Phase 2/3: Building Dynamic Glossary";
      if (progress < 90) return "Phase 3/3: AI Translation with Context";
      return "Complete: Results Ready";
    } else { // simple
      if (progress < 90) return "Phase 2/2: Fast Batch Translation";
      return "Complete: Results Ready";
    }
  };

  const getWorkflowDescription = (mode: TranslationMode, useGlossaries: boolean, glossaryCount: number) => {
    if (mode === 'simple') {
      if (useGlossaries && glossaryCount > 0) {
        return `Fast batch translation with ${glossaryCount} selected glossar${glossaryCount === 1 ? 'y' : 'ies'} for consistency`;
      } else {
        return 'Fast batch translation with pure AI processing (no glossaries)';
      }
    } else { // smart
      if (useGlossaries && glossaryCount > 0) {
        return `Intelligent dynamic glossary generation + ${glossaryCount} existing glossar${glossaryCount === 1 ? 'y' : 'ies'} for maximum accuracy`;
      } else {
        return 'Intelligent dynamic glossary generation from your content for enhanced context';
      }
    }
  };

  const getTotalPhases = (mode: TranslationMode) => {
    return mode === 'smart' ? 3 : 2;
  };

  const getCurrentPhaseStatus = (progress: number, mode: TranslationMode) => {
    if (!progress || progress === 0) return "Initializing";
    if (progress < 20) return "Parsing file";
    
    if (mode === 'smart') {
      if (progress < 50) return "Building glossary";
      if (progress < 90) return "Translating";
      return "Complete";
    } else { // simple
      if (progress < 90) return "Translating";
      return "Complete";
    }
  };

  const getPhaseNumber = (progress: number, mode: TranslationMode) => {
    if (!progress || progress === 0) return 1;
    if (progress < 20) return 1;
    
    if (mode === 'smart') {
      if (progress < 50) return 2;  // Dynamic glossary generation
      if (progress < 90) return 3;  // Translation
      return 3;  // Complete (still phase 3)
    } else { // simple
      if (progress < 90) return 2;  // Translation
      return 2;  // Complete (still phase 2)
    }
  };


  const renderFileUpload = () => (
    <div className="professional-upload-area">
      <Card
        hoverable
        onClick={handleFileSelect}
        style={{
          background: 'linear-gradient(135deg, #f5f7fa 0%, #c3cfe2 100%)',
          border: '2px dashed #8b5cf6',
          cursor: 'pointer',
          transition: 'all 0.3s ease'
        }}
        styles={{ body: { padding: '60px 50px' } }}
      >
        <div style={{ textAlign: 'center' }}>
          <CloudUploadOutlined style={{ fontSize: 64, color: '#8b5cf6', marginBottom: 24 }} />
          <Title level={2} style={{ marginBottom: 16, fontSize: 26, fontWeight: 600, letterSpacing: '-0.3px' }}>Drop your file here or click to browse</Title>
          <Text type="secondary" style={{ fontSize: 16, display: 'block', marginBottom: 28, fontWeight: 400 }}>
            Support for JSON, XML, XLSX, CSV, PO and more
          </Text>
          <Space size="large">
            <Tag color="blue" style={{ padding: '4px 12px' }}>JSON</Tag>
            <Tag color="green" style={{ padding: '4px 12px' }}>Excel</Tag>
            <Tag color="orange" style={{ padding: '4px 12px' }}>XML</Tag>
            <Tag color="purple" style={{ padding: '4px 12px' }}>PO/POT</Tag>
            <Tag color="cyan" style={{ padding: '4px 12px' }}>CSV</Tag>
          </Space>
          <div style={{ marginTop: 32 }}>
            <Button type="primary" ghost size="large" icon={<CloudUploadOutlined />} style={{ fontWeight: 500 }}>
              Choose File
            </Button>
          </div>
        </div>
      </Card>
    </div>
  );

  const renderTranslationEditor = () => (
    <div style={{ height: 'calc(100vh - 200px)', display: 'flex', flexDirection: 'column' }}>
      {/* Toolbar */}
      <div style={{ 
        background: '#fff', 
        padding: '12px 24px', 
        borderBottom: '1px solid #f0f0f0',
        display: 'flex',
        justifyContent: 'space-between',
        alignItems: 'center'
      }}>
        <Space size="large">
          <div>
            <Text type="secondary" style={{ fontSize: 12 }}>File</Text>
            <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
              <FileTextOutlined style={{ color: '#8b5cf6' }} />
              <Text strong>{fileInfo?.name}</Text>
              <Tag>{fileInfo?.format}</Tag>
              <Badge count={segments.filter(s => s.status === 'translated').length} showZero color="#52c41a">
                <Tag color="default">{segments.length} segments</Tag>
              </Badge>
            </div>
          </div>
          
          <Divider type="vertical" />
          
          <Search
            placeholder="Search segments..."
            allowClear
            style={{ width: 300 }}
            prefix={<SearchOutlined />}
            value={searchText}
            onChange={(e) => setSearchText(e.target.value)}
          />
        </Space>
        
        <Space>
          <Segmented 
            value={viewMode}
            onChange={(value) => setViewMode(value as ViewMode)}
            options={[
              { label: 'Editor', value: 'editor', icon: <EditOutlined /> },
              { label: 'Preview', value: 'preview', icon: <EyeOutlined /> },
              { label: 'Review', value: 'review', icon: <CheckCircleOutlined /> }
            ]}
          />
          
          <Button icon={<SaveOutlined />}>Save Progress</Button>
          <Button 
            type="primary" 
            icon={<DownloadOutlined />}
            onClick={handleExportFile}
            disabled={!currentTask || currentTask.status !== 'completed'}
          >
            Export
          </Button>
        </Space>
      </div>
      
      {/* Translation Interface */}
      <div style={{ flex: 1, overflow: 'hidden', background: '#fafafa' }}>
        {viewMode === 'editor' && (
          <div style={{ height: '100%', display: 'flex' }}>
            {/* Segments List */}
            <div style={{ 
              width: '40%', 
              background: '#fff', 
              borderRight: '1px solid #f0f0f0',
              overflowY: 'auto'
            }}>
              {segments.map((segment, index) => (
                <div
                  key={segment.id}
                  onClick={() => setSelectedSegment(segment.id)}
                  style={{
                    padding: '16px 20px',
                    borderBottom: '1px solid #f0f0f0',
                    cursor: 'pointer',
                    background: selectedSegment === segment.id ? '#f6f8ff' : '#fff',
                    transition: 'all 0.2s ease'
                  }}
                  className="segment-item"
                >
                  <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                    <Space>
                      <Text type="secondary" style={{ fontSize: 12 }}>#{index + 1}</Text>
                      <Tag color={getStatusColor(segment.status)}>{segment.status}</Tag>
                    </Space>
                    {segment.confidence && (
                      <Text type="secondary" style={{ fontSize: 12 }}>
                        {segment.confidence.toFixed(0)}% match
                      </Text>
                    )}
                  </div>
                  <div style={{ marginTop: 8 }}>
                    <Text strong>{segment.source}</Text>
                    {segment.target && (
                      <Text style={{ display: 'block', marginTop: 4, color: '#52c41a' }}>
                        {segment.target}
                      </Text>
                    )}
                  </div>
                </div>
              ))}
            </div>
            
            {/* Editor Panel */}
            <div style={{ flex: 1, padding: '24px', background: '#fff' }}>
              {selectedSegment ? (
                <div>
                  <Title level={4}>Segment #{selectedSegment}</Title>
                  <div style={{ marginTop: 24 }}>
                    <div style={{ marginBottom: 24 }}>
                      <Text type="secondary" style={{ display: 'block', marginBottom: 8 }}>
                        Source ({getLanguageDisplay(sourceLanguage)})
                      </Text>
                      <Card style={{ background: '#f5f5f5' }}>
                        <Text>{segments.find(s => s.id === selectedSegment)?.source}</Text>
                      </Card>
                    </div>
                    
                    <div>
                      <Text type="secondary" style={{ display: 'block', marginBottom: 8 }}>
                        Translation ({getLanguageDisplay(targetLanguage)})
                      </Text>
                      <Input.TextArea
                        rows={4}
                        placeholder="Enter translation..."
                        value={segments.find(s => s.id === selectedSegment)?.target || ''}
                        style={{ fontSize: 16 }}
                      />
                    </div>
                    
                    <div style={{ marginTop: 24 }}>
                      <Space>
                        <Button type="primary">Save & Next</Button>
                        <Button>Skip</Button>
                        <Button type="link">Apply TM</Button>
                      </Space>
                    </div>
                  </div>
                </div>
              ) : (
                <Empty description="Select a segment to start translating" />
              )}
            </div>
          </div>
        )}
      </div>
    </div>
  );

  const stats = useMemo(() => {
    if (!segments.length) return { words: 0, characters: 0, lines: 0 };
    
    const totalText = segments.map(s => s.source).join(' ');
    const words = totalText.split(/\s+/).filter(word => word.length > 0).length;
    const characters = totalText.length;
    const lines = segments.length;
    
    return { words, characters, lines };
  }, [segments]);

  const renderProjectSetup = () => {
    return (
    <div style={{ height: 'calc(100vh - 200px)', overflow: 'hidden' }}>
      <Row gutter={24} style={{ height: '100%' }}>
        <Col span={10}>
        <Card style={{ padding: 24, height: '100%', display: 'flex', flexDirection: 'column' }}>
          <Title level={2} style={{ marginBottom: 20, fontSize: 24, fontWeight: 600, letterSpacing: '-0.5px' }}>
            <Space>
              <GlobalOutlined style={{ color: '#8b5cf6' }} />
              Translation Settings
            </Space>  
          </Title>
          
          {/* Languages */}
          <Row gutter={16} style={{ marginBottom: 24 }}>
            <Col span={12}>
              <div style={{ marginBottom: 8 }}>
                <Text strong style={{ fontSize: 14, color: '#a0aec0', textTransform: 'uppercase', letterSpacing: '0.5px' }}>Source Language</Text>
              </div>
              <LanguageSelector
                value={sourceLanguage}
                onChange={onSourceLanguageChange}
                languages={languages}
                placeholder="Select source"
              />
            </Col>
            <Col span={12}>
              <div style={{ marginBottom: 8 }}>
                <Text strong style={{ fontSize: 14, color: '#a0aec0', textTransform: 'uppercase', letterSpacing: '0.5px' }}>Target Language</Text>
              </div>
              <LanguageSelector
                value={targetLanguage}
                onChange={onTargetLanguageChange}
                languages={languages}
                placeholder="Select target"
              />
            </Col>
          </Row>
          
          {/* NEW 2-Button Translation Interface */}
          <div style={{ flex: 1, display: 'flex', flexDirection: 'column' }}>
            <Text strong style={{ display: 'block', marginBottom: 16, fontSize: 14, color: '#a0aec0', textTransform: 'uppercase', letterSpacing: '0.5px' }}>
              <Space>
                <RocketOutlined />
                Translation Mode
              </Space>
            </Text>
            
            <Space direction="vertical" style={{ width: '100%' }} size={16}>
              {/* Translation Mode Selection */}
              <div style={{ display: 'flex', gap: 12, marginBottom: 16 }}>
                <Button
                  size="large"
                  type={translationMode === 'simple' ? 'primary' : 'default'}
                  onClick={() => setTranslationMode('simple')}
                  style={{ 
                    flex: 1, 
                    height: 48,
                    background: translationMode === 'simple' ? '#8b5cf6' : 'transparent',
                    borderColor: '#8b5cf6',
                    color: translationMode === 'simple' ? 'white' : '#8b5cf6'
                  }}
                  icon={<ThunderboltOutlined />}
                >
                  Simple Translation
                </Button>
                <Button
                  size="large"
                  type={translationMode === 'smart' ? 'primary' : 'default'}
                  onClick={() => setTranslationMode('smart')}
                  style={{ 
                    flex: 1, 
                    height: 48,
                    background: translationMode === 'smart' ? '#8b5cf6' : 'transparent',
                    borderColor: '#8b5cf6',
                    color: translationMode === 'smart' ? 'white' : '#8b5cf6'
                  }}
                  icon={<BookOutlined />}
                >
                  Smart Translation
                </Button>
              </div>
              
              {/* Mode Description */}
              <Card style={{ 
                background: 'rgba(139, 92, 246, 0.05)',
                border: '1px solid rgba(139, 92, 246, 0.1)',
                marginBottom: 16
              }}>
                <Text style={{ fontSize: 13, color: '#6b7280' }}>
                  {translationMode === 'simple' 
                    ? '⚡ Fast batch processing (100 entries/batch, 12 workers) with optional glossary support'
                    : '🧠 Intelligent dynamic glossary generation + translation with candidate filtering and line embeddings'
                  }
                </Text>
              </Card>
              
              {/* Glossary Toggle */}
              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 8 }}>
                <Text strong style={{ fontSize: 13 }}>Use Existing Glossaries</Text>
                <Button
                  size="small"
                  type={useGlossaries ? 'primary' : 'default'}
                  onClick={() => setUseGlossaries(!useGlossaries)}
                  style={{
                    background: useGlossaries ? '#8b5cf6' : 'transparent',
                    borderColor: '#8b5cf6',
                    color: useGlossaries ? 'white' : '#8b5cf6'
                  }}
                >
                  {useGlossaries ? 'Enabled' : 'Disabled'}
                </Button>
              </div>
              
              {useGlossaries && (
                <Card style={{ 
                  background: 'rgba(139, 92, 246, 0.05)',
                  border: '1px solid rgba(139, 92, 246, 0.2)',
                  marginTop: 16
                }}>
                  <GlossarySelector
                    selectedGlossaries={selectedGlossaries}
                    onGlossariesChange={onSelectedGlossariesChange}
                    sourceLanguage={sourceLanguage}
                    targetLanguage={targetLanguage}
                    onSourceLanguageChange={onSourceLanguageChange}
                    onTargetLanguageChange={onTargetLanguageChange}
                    onStartTranslation={() => {}}
                    onGenerateGlossary={() => {}}
                    apiKey={apiKey}
                    hideLanguageSelector={true}
                    hideButtons={true}
                  />
                </Card>
              )}
            </Space>
          </div>
          
          {/* Action Button */}
          <div style={{ textAlign: 'center', marginTop: 'auto', paddingTop: 20 }}>
            <Button
              type="primary"
              size="large"
              icon={<RocketOutlined />}
              onClick={handleStartTranslation}
              style={{
                background: '#8b5cf6',
                borderColor: '#8b5cf6',
                height: 44,
                paddingLeft: 28,
                paddingRight: 28,
                fontSize: 15
              }}
            >
              Start Translation
            </Button>
          </div>
        </Card>
      </Col>
      
      <Col span={14}>
        <div className="project-overview-compact" style={{ height: '100%' }}>
          <div style={{ display: 'flex', alignItems: 'center', marginBottom: 24 }}>
            <FileTextOutlined style={{ color: '#8b5cf6', fontSize: 20, marginRight: 12 }} />
            <Title level={3} style={{ margin: 0, fontSize: 20, fontWeight: 600 }}>Project Overview</Title>
          </div>
          
          {/* File Details */}
          <div className="project-overview-section">
            <div className="section-title">File Details</div>
            
            <div className="stat-item">
              <span className="stat-label">Name</span>
              <span className="stat-value">{fileInfo?.name}</span>
            </div>
            
            <div className="stat-item">
              <span className="stat-label">Format</span>
              <Tag color="blue" style={{ marginLeft: 8 }}>{fileInfo?.format}</Tag>
            </div>
            
            <div className="stat-item">
              <span className="stat-label">Size</span>
              <span className="stat-value">{(fileInfo?.size / 1024).toFixed(1)} KB</span>
            </div>
          </div>
            
          {/* Content Statistics */}
          <div className="project-overview-section">
            <div className="section-title">Content Analysis</div>
            
            <div className="stat-item">
              <span className="stat-label">Total Segments</span>
              <span className="stat-value highlight">{fileInfo?.entries}</span>
            </div>
            
            <div className="stat-item">
              <span className="stat-label">Word Count</span>
              <span className="stat-value">{stats.words.toLocaleString()}</span>
            </div>
            
            <div className="stat-item">
              <span className="stat-label">Character Count</span>
              <span className="stat-value">{stats.characters.toLocaleString()}</span>
            </div>
            
            <div className="stat-item">
              <span className="stat-label">Lines of Text</span>
              <span className="stat-value">{stats.lines}</span>
            </div>
          </div>
            
          {/* Processing Estimates */}
          <div className="project-overview-section">
            <div className="section-title">Processing Estimates</div>
            
            <div className="stat-item">
              <span className="stat-label">Estimated Time</span>
              <span className="stat-value">
                <ClockCircleOutlined style={{ marginRight: 4, color: '#8b5cf6' }} />
                ~{Math.max(2, Math.ceil(stats.words / 100))} min
              </span>
            </div>
            
            <div className="stat-item">
              <span className="stat-label">Token Estimate</span>
              <span className="stat-value">~{Math.ceil(stats.characters * 0.75)}</span>
            </div>
          </div>
        </div>
      </Col>
    </Row>
    </div>
    );
  };

  // Main Render
  if (!fileInfo) {
    return (
      <div className="file-translation-view" style={{ padding: '40px', height: 'calc(100vh - 80px)', overflow: 'hidden' }}>
        <div style={{ textAlign: 'center', marginBottom: 40 }}>
          <Title level={1} style={{ fontSize: 32, marginBottom: 12, fontWeight: 600, letterSpacing: '-0.5px' }}>Professional File Translation</Title>
          <Text type="secondary" style={{ fontSize: 16, fontWeight: 400 }}>
            AI-powered translation with glossary management for game localization
          </Text>
        </div>
        {renderFileUpload()}
      </div>
    );
  }

  if (isTranslating && currentTask) {
    return (
      <div className="file-translation-view" style={{ padding: '40px', maxWidth: 1000, margin: '0 auto' }}>
        <Card style={{ borderRadius: 12, overflow: 'hidden' }}>
          {/* Professional Multi-Phase Header */}
          <div style={{ 
            background: 'linear-gradient(135deg, #8b5cf6 0%, #6d28d9 100%)',
            margin: '-24px -24px 24px -24px',
            padding: '24px',
            color: 'white'
          }}>
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: 16 }}>
                <SyncOutlined spin style={{ fontSize: 32 }} />
                <div>
                  <Title level={2} style={{ color: 'white', margin: 0, fontSize: 24 }}>
                    {currentTask.current_phase || getPhaseDescription(currentTask.progress, translationMode)}
                  </Title>
                  <Text style={{ color: 'rgba(255,255,255,0.8)', fontSize: 16 }}>
                    {getWorkflowDescription(translationMode, useGlossaries, selectedGlossaries.length)}
                  </Text>
                  {/* Current Processing Item */}
                  {currentTask.current_item && (
                    <div style={{ marginTop: 8, padding: '6px 12px', background: 'rgba(255,255,255,0.15)', borderRadius: 6, fontSize: 14 }}>
                      <Text style={{ color: 'white', fontWeight: 500 }}>
                        Processing: "{currentTask.current_item.length > 60 ? 
                          currentTask.current_item.substring(0, 60) + '...' : 
                          currentTask.current_item}"
                      </Text>
                    </div>
                  )}
                </div>
              </div>
              <div style={{ textAlign: 'right' }}>
                <div style={{ fontSize: 28, fontWeight: 'bold' }}>{currentTask.progress || 0}%</div>
                <div style={{ color: 'rgba(255,255,255,0.8)', fontSize: 12 }}>COMPLETE</div>
                {/* Live Processing Speed */}
                {currentTask.items_completed && currentTask.processing_time && (
                  <div style={{ color: 'rgba(255,255,255,0.7)', fontSize: 12, marginTop: 4 }}>
                    {(currentTask.items_completed / (currentTask.processing_time / 1000)).toFixed(1)} items/sec
                  </div>
                )}
              </div>
            </div>
          </div>

          {/* Progress Bar */}
          <div style={{ marginBottom: 32 }}>
            <Progress 
              percent={currentTask.progress || 0} 
              strokeColor={{
                '0%': '#8b5cf6',
                '50%': '#a855f7', 
                '100%': '#9333ea'
              }}
              trailColor="#f3f4f6"
              strokeWidth={12}
              showInfo={false}
              style={{ marginBottom: 16 }}
            />
            
            {/* Enhanced Phase Indicators */}
            <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 24, position: 'relative' }}>
              {/* Progress Line */}
              <div style={{
                position: 'absolute',
                top: 6,
                left: '12.5%',
                right: '12.5%',
                height: 2,
                background: '#e5e7eb',
                zIndex: 1
              }}>
                <div style={{
                  height: '100%',
                  background: 'linear-gradient(90deg, #8b5cf6, #a855f7)',
                  width: `${Math.max(0, (currentTask.progress || 0) - 5)}%`,
                  transition: 'width 0.3s ease'
                }} />
              </div>
              
              {/* Phase 1: Upload */}
              <div style={{ textAlign: 'center', flex: 1, position: 'relative', zIndex: 2 }}>
                <div style={{ 
                  width: 16, height: 16, borderRadius: '50%',
                  background: (currentTask.progress || 0) > 0 ? '#8b5cf6' : '#e5e7eb',
                  margin: '0 auto 8px',
                  border: '3px solid white',
                  boxShadow: '0 2px 4px rgba(0,0,0,0.1)',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center'
                }}>
                  {(currentTask.progress || 0) > 0 && (
                    <div style={{ width: 6, height: 6, borderRadius: '50%', background: 'white' }} />
                  )}
                </div>
                <Text style={{ fontSize: 11, color: '#6b7280', fontWeight: 500 }}>Upload</Text>
                {(currentTask.progress || 0) <= 20 && (currentTask.progress || 0) > 0 && (
                  <div style={{ fontSize: 10, color: '#8b5cf6', marginTop: 2 }}>Active</div>
                )}
              </div>
              
              {/* Phase 2: Dynamic Glossary (conditional) */}
              {translationMode === 'smart' && (
                <div style={{ textAlign: 'center', flex: 1, position: 'relative', zIndex: 2 }}>
                  <div style={{ 
                    width: 16, height: 16, borderRadius: '50%',
                    background: (currentTask.progress || 0) > 20 ? '#8b5cf6' : '#e5e7eb',
                    margin: '0 auto 8px',
                    border: '3px solid white',
                    boxShadow: '0 2px 4px rgba(0,0,0,0.1)',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center'
                  }}>
                    {(currentTask.progress || 0) > 20 && (
                      <div style={{ width: 6, height: 6, borderRadius: '50%', background: 'white' }} />
                    )}
                  </div>
                  <Text style={{ fontSize: 11, color: '#6b7280', fontWeight: 500 }}>Glossary</Text>
                  {(currentTask.progress || 0) > 20 && (currentTask.progress || 0) <= 50 && (
                    <div style={{ fontSize: 10, color: '#8b5cf6', marginTop: 2 }}>Building</div>
                  )}
                </div>
              )}
              
              {/* Phase 3: Translation */}
              <div style={{ textAlign: 'center', flex: 1, position: 'relative', zIndex: 2 }}>
                <div style={{ 
                  width: 16, height: 16, borderRadius: '50%',
                  background: (currentTask.progress || 0) > (translationMode === 'smart' ? 50 : 20) ? '#8b5cf6' : '#e5e7eb',
                  margin: '0 auto 8px',
                  border: '3px solid white',
                  boxShadow: '0 2px 4px rgba(0,0,0,0.1)',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center'
                }}>
                  {(currentTask.progress || 0) > (translationMode === 'smart' ? 50 : 20) && (
                    <div style={{ width: 6, height: 6, borderRadius: '50%', background: 'white' }} />
                  )}
                </div>
                <Text style={{ fontSize: 11, color: '#6b7280', fontWeight: 500 }}>Translation</Text>
                {(currentTask.progress || 0) > (translationMode === 'smart' ? 50 : 20) && (currentTask.progress || 0) < 90 && (
                  <div style={{ fontSize: 10, color: '#8b5cf6', marginTop: 2 }}>Processing</div>
                )}
              </div>
              
              {/* Phase 4: Complete */}
              <div style={{ textAlign: 'center', flex: 1, position: 'relative', zIndex: 2 }}>
                <div style={{ 
                  width: 16, height: 16, borderRadius: '50%',
                  background: (currentTask.progress || 0) >= 100 ? '#10b981' : '#e5e7eb',
                  margin: '0 auto 8px',
                  border: '3px solid white',
                  boxShadow: '0 2px 4px rgba(0,0,0,0.1)',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center'
                }}>
                  {(currentTask.progress || 0) >= 100 && (
                    <div style={{ width: 6, height: 6, borderRadius: '50%', background: 'white' }} />
                  )}
                </div>
                <Text style={{ fontSize: 11, color: '#6b7280', fontWeight: 500 }}>Complete</Text>
                {(currentTask.progress || 0) >= 100 && (
                  <div style={{ fontSize: 10, color: '#10b981', marginTop: 2 }}>Done</div>
                )}
              </div>
            </div>
          </div>

          {/* Enhanced Real-time Stats Grid */}
          <Row gutter={16} style={{ marginBottom: 24 }}>
            <Col span={6}>
              <Card style={{ 
                background: 'linear-gradient(135deg, #f8fafc 0%, #e2e8f0 100%)', 
                border: '1px solid #cbd5e1', 
                textAlign: 'center',
                borderRadius: 12,
                overflow: 'hidden'
              }}>
                <div style={{ fontSize: 24, fontWeight: 'bold', color: '#1e293b', marginBottom: 4 }}>
                  {currentTask.items_completed || 0}
                  <span style={{ fontSize: 14, color: '#64748b', fontWeight: 'normal' }}>
                    /{currentTask.total_items || fileInfo?.entries || 0}
                  </span>
                </div>
                <Text type="secondary" style={{ fontSize: 11, fontWeight: 500, textTransform: 'uppercase', letterSpacing: '0.5px' }}>Items Processed</Text>
                {/* Progress bar for items */}
                <div style={{ marginTop: 8, height: 3, background: '#e2e8f0', borderRadius: 2 }}>
                  <div style={{
                    height: '100%',
                    background: '#8b5cf6',
                    borderRadius: 2,
                    width: `${currentTask.total_items ? ((currentTask.items_completed || 0) / currentTask.total_items) * 100 : 0}%`,
                    transition: 'width 0.3s ease'
                  }} />
                </div>
              </Card>
            </Col>
            
            <Col span={6}>
              <Card style={{ 
                background: 'linear-gradient(135deg, #fef3c7 0%, #fde68a 100%)', 
                border: '1px solid #f59e0b', 
                textAlign: 'center',
                borderRadius: 12,
                overflow: 'hidden'
              }}>
                <div style={{ fontSize: 24, fontWeight: 'bold', color: '#92400e', marginBottom: 4 }}>
                  {currentTask.items_completed && currentTask.processing_time ? 
                    (currentTask.items_completed / (currentTask.processing_time / 1000)).toFixed(1) : '0.0'}
                </div>
                <Text style={{ fontSize: 11, fontWeight: 500, textTransform: 'uppercase', letterSpacing: '0.5px', color: '#92400e' }}>Items/sec</Text>
                {/* Speed indicator */}
                <div style={{ marginTop: 8, display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 4 }}>
                  <ThunderboltOutlined style={{ color: '#f59e0b', fontSize: 12 }} />
                  <Text style={{ fontSize: 10, color: '#92400e' }}>
                    {currentTask.items_completed && currentTask.processing_time ? 'Fast' : 'Initializing'}
                  </Text>
                </div>
              </Card>
            </Col>
            
            <Col span={6}>
              <Card style={{ 
                background: 'linear-gradient(135deg, #dcfce7 0%, #bbf7d0 100%)', 
                border: '1px solid #10b981', 
                textAlign: 'center',
                borderRadius: 12,
                overflow: 'hidden'
              }}>
                <div style={{ fontSize: 24, fontWeight: 'bold', color: '#065f46', marginBottom: 4 }}>
                  {currentTask.estimated_remaining ? 
                    Math.ceil(currentTask.estimated_remaining / 1000) + 's' : 
                    currentTask.total_items && currentTask.items_completed ? 
                      Math.ceil(((currentTask.total_items - currentTask.items_completed) * 2.5)) + 's' : '~'}
                </div>
                <Text style={{ fontSize: 11, fontWeight: 500, textTransform: 'uppercase', letterSpacing: '0.5px', color: '#065f46' }}>Time Remaining</Text>
                {/* Time indicator */}
                <div style={{ marginTop: 8, display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 4 }}>
                  <ClockCircleOutlined style={{ color: '#10b981', fontSize: 12 }} />
                  <Text style={{ fontSize: 10, color: '#065f46' }}>
                    {currentTask.processing_time ? 
                      `${Math.floor((currentTask.processing_time || 0) / 1000)}s elapsed` : 'Starting'}
                  </Text>
                </div>
              </Card>
            </Col>
            
            <Col span={6}>
              <Card style={{ 
                background: 'linear-gradient(135deg, #ede9fe 0%, #ddd6fe 100%)', 
                border: '1px solid #8b5cf6', 
                textAlign: 'center',
                borderRadius: 12,
                overflow: 'hidden'
              }}>
                <div style={{ fontSize: 24, fontWeight: 'bold', color: '#6b21a8', marginBottom: 4 }}>
                  {getPhaseNumber(currentTask.progress, translationMode)}
                  <span style={{ fontSize: 14, color: '#8b5cf6', fontWeight: 'normal' }}>
                    /{getTotalPhases(translationMode)}
                  </span>
                </div>
                <Text style={{ fontSize: 11, fontWeight: 500, textTransform: 'uppercase', letterSpacing: '0.5px', color: '#6b21a8' }}>Current Phase</Text>
                {/* Phase indicator */}
                <div style={{ marginTop: 8, display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 4 }}>
                  <GlobalOutlined style={{ color: '#8b5cf6', fontSize: 12 }} />
                  <Text style={{ fontSize: 10, color: '#6b21a8' }}>
                    {getCurrentPhaseStatus(currentTask.progress, translationMode)}
                  </Text>
                </div>
              </Card>
            </Col>
          </Row>

          {/* Current Processing Item */}
          {currentTask.current_item && (
            <Card style={{ 
              background: 'linear-gradient(135deg, #fef3c7 0%, #fde68a 100%)',
              border: '1px solid #f59e0b',
              marginBottom: 24
            }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
                <ThunderboltOutlined style={{ color: '#f59e0b', fontSize: 18 }} />
                <div style={{ flex: 1 }}>
                  <Text strong style={{ color: '#92400e', display: 'block', fontSize: 14 }}>
                    Currently Processing:
                  </Text>
                  <Text style={{ color: '#451a03', fontSize: 16, fontWeight: 500 }}>
                    "{currentTask.current_item.length > 80 ? 
                      currentTask.current_item.substring(0, 80) + '...' : 
                      currentTask.current_item}"
                  </Text>
                </div>
              </div>
            </Card>
          )}

          {/* Status Messages */}
          <div style={{ 
            background: '#f1f5f9',
            border: '1px solid #cbd5e1',
            borderRadius: 8,
            padding: 16,
            textAlign: 'center'
          }}>
            <Text style={{ color: '#475569', fontSize: 14 }}>
              {currentTask.status_message || 'Processing your file with AI translation engine...'}
            </Text>
          </div>

          {/* Cancel Button */}
          <div style={{ textAlign: 'center', marginTop: 24 }}>
            <Button 
              type="default" 
              onClick={() => {
                setIsTranslating(false);
                setCurrentTask(null);
                notification.info({
                  message: 'Translation Cancelled',
                  description: 'The translation task has been cancelled.',
                  duration: 3
                });
              }}
              style={{ minWidth: 120 }}
            >
              Cancel Translation
            </Button>
          </div>
        </Card>
      </div>
    );
  }

  // Show completion screen when translation is finished
  if (currentTask && currentTask.status === 'completed' && segments.length > 0) {
    return (
      <div className="file-translation-view" style={{ padding: '40px', maxWidth: 1000, margin: '0 auto' }}>
        <Card style={{ textAlign: 'center', borderRadius: 12 }}>
          <CheckCircleOutlined style={{ fontSize: 64, color: '#10b981', marginBottom: 24 }} />
          <Title level={2} style={{ color: '#10b981', marginBottom: 16 }}>Translation Complete!</Title>
          <Text type="secondary" style={{ fontSize: 16, display: 'block', marginBottom: 32 }}>
            Successfully translated {segments.length} segments from {getLanguageDisplay(sourceLanguage)} to {getLanguageDisplay(targetLanguage)}
          </Text>
          
          <Space size="large" style={{ marginBottom: 32 }}>
            <Button 
              type="primary" 
              size="large"
              icon={<DownloadOutlined />}
              onClick={handleExportFile}
              style={{ 
                background: '#10b981', 
                borderColor: '#10b981',
                height: 44,
                paddingLeft: 28,
                paddingRight: 28 
              }}
            >
              Download Translated File
            </Button>
            <Button 
              size="large"
              icon={<EyeOutlined />}
              onClick={() => {
                // Switch to editor view to see results
              }}
              style={{ height: 44 }}
            >
              Review Translations
            </Button>
          </Space>
          
          {/* Summary Stats */}
          <div style={{ background: '#f8fafc', borderRadius: 8, padding: 24, marginTop: 24 }}>
            <Row gutter={24}>
              <Col span={8}>
                <div style={{ textAlign: 'center' }}>
                  <div style={{ fontSize: 20, fontWeight: 'bold', color: '#1e293b' }}>{segments.length}</div>
                  <Text type="secondary">Segments Translated</Text>
                </div>
              </Col>
              <Col span={8}>
                <div style={{ textAlign: 'center' }}>
                  <div style={{ fontSize: 20, fontWeight: 'bold', color: '#8b5cf6' }}>{fileInfo?.format}</div>
                  <Text type="secondary">Original Format</Text>
                </div>
              </Col>
              <Col span={8}>
                <div style={{ textAlign: 'center' }}>
                  <div style={{ fontSize: 20, fontWeight: 'bold', color: '#059669' }}>
                    {currentTask.processing_time ? Math.ceil(currentTask.processing_time / 1000) + 's' : '~'}
                  </div>
                  <Text type="secondary">Processing Time</Text>
                </div>
              </Col>
            </Row>
          </div>
        </Card>
      </div>
    );
  }

  if (segments.length > 0 && segments.some(s => s.target)) {
    return <div className="file-translation-view">{renderTranslationEditor()}</div>;
  }

  return (
    <div className="file-translation-view" style={{ padding: '40px', height: 'calc(100vh - 80px)', overflow: 'hidden' }}>
      {renderProjectSetup()}
    </div>
  );
};

export default ProfessionalFileTranslation;