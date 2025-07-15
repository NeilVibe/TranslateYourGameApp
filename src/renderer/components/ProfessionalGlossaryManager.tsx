import React, { useState, useEffect, useCallback, useMemo } from 'react';
import { 
  Table, Button, Modal, Form, Input, Space, Typography, message, 
  Popconfirm, Select, Checkbox, Tag, Tooltip, Progress, Card,
  Divider, Row, Col, Statistic, Upload
} from 'antd';
import { 
  PlusOutlined, EditOutlined, DeleteOutlined, SearchOutlined, 
  DownloadOutlined, UploadOutlined, FilterOutlined,
  CheckOutlined, SaveOutlined, CloseOutlined
} from '@ant-design/icons';

const { Title, Text } = Typography;
const { Search } = Input;
const { Option } = Select;

interface GlossaryEntry {
  id: number;
  source_text: string;
  target_text: string;
  created_at: string;
  character_count?: number;
  is_line_entry?: boolean;
}

interface Glossary {
  id: number;
  name: string;
  description: string;
  entry_count: number;
  created_at: string;
}

interface ProfessionalGlossaryManagerProps {
  apiKey: string;
  apiBaseUrl: string;
}

const ProfessionalGlossaryManager: React.FC<ProfessionalGlossaryManagerProps> = ({ 
  apiKey, 
  apiBaseUrl 
}) => {
  // State Management
  const [glossaries, setGlossaries] = useState<Glossary[]>([]);
  const [selectedGlossary, setSelectedGlossary] = useState<Glossary | null>(null);
  const [entries, setEntries] = useState<GlossaryEntry[]>([]);
  const [loading, setLoading] = useState(false);
  const [isModalVisible, setIsModalVisible] = useState(false);
  const [editingEntry, setEditingEntry] = useState<GlossaryEntry | null>(null);
  const [inlineEditingId, setInlineEditingId] = useState<number | null>(null);
  const [inlineEditValue, setInlineEditValue] = useState<{source: string, target: string}>({source: '', target: ''});
  const [form] = Form.useForm();
  
  // Advanced Search & Filter
  const [searchText, setSearchText] = useState('');
  const [sortBy, setSortBy] = useState<'name' | 'length' | 'created'>('length');
  const [filterType, setFilterType] = useState<'all' | 'short' | 'medium' | 'long' | 'line'>('all');
  const [selectedRowKeys, setSelectedRowKeys] = useState<number[]>([]);
  
  // Async upload state
  const [uploadModalVisible, setUploadModalVisible] = useState(false);
  const [uploadTaskId, setUploadTaskId] = useState<string | null>(null);
  const [uploadProgress, setUploadProgress] = useState<any>(null);
  const [isUploading, setIsUploading] = useState(false);

  // Load data
  useEffect(() => {
    loadGlossaries();
  }, []);

  useEffect(() => {
    if (selectedGlossary) {
      loadGlossaryEntries(selectedGlossary.id);
    }
  }, [selectedGlossary]);

  const loadGlossaries = async () => {
    try {
      setLoading(true);
      const response = await fetch(`${apiBaseUrl}/glossaries`, {
        headers: { 'X-API-Key': apiKey }
      });
      
      if (!response.ok) throw new Error('Failed to load glossaries');
      
      const data = await response.json();
      if (data.status === 'success' && data.data) {
        setGlossaries(data.data.glossaries || []);
      }
    } catch (error) {
      console.error('Error loading glossaries:', error);
      message.error('Failed to load glossaries');
    } finally {
      setLoading(false);
    }
  };

  const loadGlossaryEntries = async (glossaryId: number) => {
    try {
      setLoading(true);
      const response = await fetch(`${apiBaseUrl}/glossaries/${glossaryId}/entries?include_line_entries=true`, {
        headers: { 'X-API-Key': apiKey }
      });
      
      if (!response.ok) throw new Error('Failed to load entries');
      
      const data = await response.json();
      if (data.status === 'success' && data.data) {
        const entriesWithMetadata = (data.data.entries || []).map((entry: GlossaryEntry) => ({
          ...entry,
          character_count: entry.source_text.length,
          is_line_entry: entry.source_text.length > 100 // Simple heuristic
        }));
        setEntries(entriesWithMetadata);
      }
    } catch (error) {
      console.error('Error loading entries:', error);
      message.error('Failed to load glossary entries');
    } finally {
      setLoading(false);
    }
  };

  // Smart filtering and sorting
  const processedEntries = useMemo(() => {
    let filtered = entries.filter(entry => {
      // Text search
      const matchesSearch = searchText === '' || 
        entry.source_text.toLowerCase().includes(searchText.toLowerCase()) ||
        entry.target_text.toLowerCase().includes(searchText.toLowerCase());
      
      // Type filter
      const matchesType = (() => {
        switch (filterType) {
          case 'short': return entry.character_count! <= 20;
          case 'medium': return entry.character_count! > 20 && entry.character_count! <= 100;
          case 'long': return entry.character_count! > 100 && !entry.is_line_entry;
          case 'line': return entry.is_line_entry;
          default: return true;
        }
      })();

      return matchesSearch && matchesType;
    });

    // Sort
    filtered.sort((a, b) => {
      switch (sortBy) {
        case 'length':
          return a.character_count! - b.character_count!;
        case 'name':
          return a.source_text.localeCompare(b.source_text);
        case 'created':
          return new Date(b.created_at).getTime() - new Date(a.created_at).getTime();
        default:
          return 0;
      }
    });

    return filtered;
  }, [entries, searchText, sortBy, filterType]);

  // Statistics
  const stats = useMemo(() => {
    const total = entries.length;
    const short = entries.filter(e => e.character_count! <= 20).length;
    const medium = entries.filter(e => e.character_count! > 20 && e.character_count! <= 100).length;
    const long = entries.filter(e => e.character_count! > 100).length;
    
    return { total, short, medium, long };
  }, [entries]);

  // Inline editing handlers
  const startInlineEdit = (entry: GlossaryEntry) => {
    setInlineEditingId(entry.id);
    setInlineEditValue({
      source: entry.source_text,
      target: entry.target_text
    });
  };

  const saveInlineEdit = async () => {
    if (!inlineEditingId || !selectedGlossary) return;

    try {
      const response = await fetch(`${apiBaseUrl}/glossaries/${selectedGlossary.id}/entries/${inlineEditingId}`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
          'X-API-Key': apiKey
        },
        body: JSON.stringify({
          source_text: inlineEditValue.source,
          target_text: inlineEditValue.target
        })
      });
      
      if (!response.ok) throw new Error('Failed to update entry');
      
      message.success('Entry updated successfully');
      setInlineEditingId(null);
      await loadGlossaryEntries(selectedGlossary.id);
      
      // Auto-trigger embedding registration
      message.info('Updating embedding vectors...', 1);
      
    } catch (error) {
      console.error('Error updating entry:', error);
      message.error('Failed to update entry');
    }
  };

  const cancelInlineEdit = () => {
    setInlineEditingId(null);
    setInlineEditValue({source: '', target: ''});
  };

  // Bulk operations
  const handleBulkDelete = async () => {
    if (selectedRowKeys.length === 0) return;

    try {
      await Promise.all(
        selectedRowKeys.map(entryId =>
          fetch(`${apiBaseUrl}/glossaries/${selectedGlossary?.id}/entries/${entryId}`, {
            method: 'DELETE',
            headers: { 'X-API-Key': apiKey }
          })
        )
      );
      
      message.success(`Deleted ${selectedRowKeys.length} entries`);
      setSelectedRowKeys([]);
      loadGlossaryEntries(selectedGlossary!.id);
    } catch (error) {
      message.error('Failed to delete entries');
    }
  };

  // Individual CRUD operations
  const handleFileUpload = async (file: File) => {
    if (!selectedGlossary) return false;
    
    setIsUploading(true);
    setUploadModalVisible(true);
    setUploadProgress({
      progress: 0,
      current_phase: 'Uploading file...',
      items_completed: 0,
      total_items: 0
    });
    
    try {
      const formData = new FormData();
      formData.append('file', file);
      
      const response = await fetch(`${apiBaseUrl}/glossaries/${selectedGlossary.id}/upload-async`, {
        method: 'POST',
        headers: {
          'X-API-Key': apiKey
        },
        body: formData
      });
      
      if (!response.ok) throw new Error('Upload failed');
      
      const data = await response.json();
      if (data.status === 'success') {
        setUploadTaskId(data.data.task_id);
        
        // Start polling for progress
        pollUploadProgress(data.data.task_id);
      } else {
        throw new Error(data.message || 'Upload failed');
      }
      
    } catch (error) {
      console.error('Upload error:', error);
      message.error('Failed to start upload');
      setIsUploading(false);
      setUploadModalVisible(false);
    }
    
    return false; // Prevent default upload behavior
  };
  
  const pollUploadProgress = async (taskId: string) => {
    try {
      const response = await fetch(`${apiBaseUrl}/tasks/${taskId}`, {
        headers: { 'X-API-Key': apiKey }
      });
      
      if (!response.ok) throw new Error('Failed to get task status');
      
      const data = await response.json();
      const task = data.data;
      
      setUploadProgress({
        progress: task.progress || 0,
        current_phase: task.current_phase || 'Processing...',
        items_completed: task.items_completed || 0,
        total_items: task.items_total || 0,
        status: task.status
      });
      
      if (task.status === 'completed') {
        message.success('Glossary uploaded successfully!');
        setIsUploading(false);
        setUploadTaskId(null);
        
        // Reload entries
        loadGlossaryEntries(selectedGlossary!.id);
        
        // Update glossary count
        loadGlossaries();
        
        // Close modal after 2 seconds
        setTimeout(() => {
          setUploadModalVisible(false);
          setUploadProgress(null);
        }, 2000);
        
      } else if (task.status === 'failed') {
        throw new Error(task.error_message || 'Upload failed');
      } else {
        // Continue polling
        setTimeout(() => pollUploadProgress(taskId), 1000);
      }
      
    } catch (error) {
      console.error('Poll error:', error);
      message.error('Upload failed');
      setIsUploading(false);
      setUploadModalVisible(false);
    }
  };

  const handleDeleteEntry = async (entryId: number) => {
    try {
      const response = await fetch(`${apiBaseUrl}/glossaries/${selectedGlossary?.id}/entries/${entryId}`, {
        method: 'DELETE',
        headers: { 'X-API-Key': apiKey }
      });
      
      if (!response.ok) throw new Error('Failed to delete entry');
      
      message.success('Entry deleted successfully');
      loadGlossaryEntries(selectedGlossary!.id);
    } catch (error) {
      console.error('Error deleting entry:', error);
      message.error('Failed to delete entry');
    }
  };

  const handleSaveEntry = async (values: any) => {
    try {
      const url = editingEntry 
        ? `${apiBaseUrl}/glossaries/${selectedGlossary?.id}/entries/${editingEntry.id}`
        : `${apiBaseUrl}/glossaries/${selectedGlossary?.id}/entries`;
      
      const method = editingEntry ? 'PUT' : 'POST';
      const body = editingEntry 
        ? values
        : { entries: [values] };

      const response = await fetch(url, {
        method,
        headers: {
          'Content-Type': 'application/json',
          'X-API-Key': apiKey
        },
        body: JSON.stringify(body)
      });
      
      if (!response.ok) throw new Error('Failed to save entry');
      
      message.success(editingEntry ? 'Entry updated successfully' : 'Entry added successfully');
      setIsModalVisible(false);
      await loadGlossaryEntries(selectedGlossary!.id);
      
      // Auto-trigger embedding registration for new entries
      if (!editingEntry) {
        message.info('Registering embedding vectors...', 1);
      }
      
    } catch (error) {
      console.error('Error saving entry:', error);
      message.error('Failed to save entry');
    }
  };

  // Enhanced columns with inline editing
  const columns = [
    {
      title: 'Source Text',
      dataIndex: 'source_text',
      key: 'source_text',
      width: '35%',
      render: (text: string, record: GlossaryEntry) => {
        const isEditing = inlineEditingId === record.id;
        
        return isEditing ? (
          <Input.TextArea
            value={inlineEditValue.source}
            onChange={(e) => setInlineEditValue(prev => ({...prev, source: e.target.value}))}
            autoSize={{ minRows: 1, maxRows: 4 }}
            style={{ width: '100%' }}
          />
        ) : (
          <div onClick={() => startInlineEdit(record)} style={{ cursor: 'pointer', minHeight: '22px' }}>
            <Text>{text}</Text>
            <div style={{ fontSize: '12px', color: '#8b949e', marginTop: '2px' }}>
              <Tag color={record.character_count! <= 20 ? 'green' : record.character_count! <= 100 ? 'orange' : 'red'}>
                {record.character_count} chars
              </Tag>
              {record.is_line_entry && <Tag color="purple">Line</Tag>}
            </div>
          </div>
        );
      },
    },
    {
      title: 'Target Text',
      dataIndex: 'target_text',
      key: 'target_text',
      width: '35%',
      render: (text: string, record: GlossaryEntry) => {
        const isEditing = inlineEditingId === record.id;
        
        return isEditing ? (
          <Input.TextArea
            value={inlineEditValue.target}
            onChange={(e) => setInlineEditValue(prev => ({...prev, target: e.target.value}))}
            autoSize={{ minRows: 1, maxRows: 4 }}
            style={{ width: '100%' }}
          />
        ) : (
          <div onClick={() => startInlineEdit(record)} style={{ cursor: 'pointer', minHeight: '22px' }}>
            <Text>{text}</Text>
          </div>
        );
      },
    },
    {
      title: 'Actions',
      key: 'actions',
      width: '30%',
      render: (_: any, record: GlossaryEntry) => {
        const isEditing = inlineEditingId === record.id;
        
        return isEditing ? (
          <Space>
            <Button 
              type="text" 
              icon={<CheckOutlined />} 
              onClick={saveInlineEdit}
              style={{ color: '#52c41a' }}
            />
            <Button 
              type="text" 
              icon={<CloseOutlined />} 
              onClick={cancelInlineEdit}
              style={{ color: '#ff4d4f' }}
            />
          </Space>
        ) : (
          <Space>
            <Tooltip title="Click text to edit inline">
              <Button 
                type="text" 
                icon={<EditOutlined />} 
                onClick={() => startInlineEdit(record)}
                size="small"
              />
            </Tooltip>
            <Popconfirm
              title="Delete this entry?"
              onConfirm={() => handleDeleteEntry(record.id)}
            >
              <Button type="text" danger icon={<DeleteOutlined />} size="small" />
            </Popconfirm>
          </Space>
        );
      },
    },
  ];

  const rowSelection = {
    selectedRowKeys,
    onChange: (selectedRowKeys: React.Key[]) => setSelectedRowKeys(selectedRowKeys as number[]),
    selections: [
      Table.SELECTION_ALL,
      Table.SELECTION_INVERT,
      Table.SELECTION_NONE,
    ],
  };

  return (
    <div style={{ padding: '24px', background: '#0f0f0f', minHeight: '100vh' }}>
      <Title level={2} style={{ color: '#e2e8f0', marginBottom: '24px' }}>
        Professional Glossary Management
      </Title>
      
      {/* Glossary Selection */}
      <Card style={{ background: '#1a1a1a', borderColor: '#333', marginBottom: '24px' }}>
        <Title level={4} style={{ color: '#a0aec0', marginBottom: '16px' }}>Select Glossary:</Title>
        <Space wrap>
          {glossaries.map((glossary) => (
            <Button 
              key={glossary.id}
              type={selectedGlossary?.id === glossary.id ? 'primary' : 'default'}
              onClick={() => setSelectedGlossary(glossary)}
              style={{ marginBottom: '8px' }}
            >
              {glossary.name} ({glossary.entry_count} entries)
            </Button>
          ))}
        </Space>
      </Card>

      {selectedGlossary && (
        <>
          {/* Statistics Dashboard */}
          <Card style={{ background: '#1a1a1a', borderColor: '#333', marginBottom: '24px' }}>
            <Row gutter={16}>
              <Col span={6}>
                <Statistic title="Total Entries" value={stats.total} valueStyle={{ color: '#e2e8f0' }} />
              </Col>
              <Col span={6}>
                <Statistic title="Short (≤20)" value={stats.short} valueStyle={{ color: '#52c41a' }} />
              </Col>
              <Col span={6}>
                <Statistic title="Medium (21-100)" value={stats.medium} valueStyle={{ color: '#fa8c16' }} />
              </Col>
              <Col span={6}>
                <Statistic title="Long (>100)" value={stats.long} valueStyle={{ color: '#ff4d4f' }} />
              </Col>
            </Row>
          </Card>

          {/* Advanced Controls */}
          <Card style={{ background: '#1a1a1a', borderColor: '#333', marginBottom: '16px' }}>
            <Row gutter={16} align="middle">
              <Col flex="auto">
                <Title level={3} style={{ color: '#e2e8f0', margin: 0 }}>
                  {selectedGlossary.name}
                </Title>
              </Col>
              <Col>
                <Space size="middle">
                  <Search
                    placeholder="Smart search..."
                    value={searchText}
                    onChange={(e) => setSearchText(e.target.value)}
                    style={{ width: 200 }}
                    allowClear
                  />
                  <Select
                    value={sortBy}
                    onChange={setSortBy}
                    style={{ width: 120 }}
                  >
                    <Option value="length">By Length</Option>
                    <Option value="name">By Name</Option>
                    <Option value="created">By Date</Option>
                  </Select>
                  <Select
                    value={filterType}
                    onChange={setFilterType}
                    style={{ width: 100 }}
                  >
                    <Option value="all">All</Option>
                    <Option value="short">Short</Option>
                    <Option value="medium">Medium</Option>
                    <Option value="long">Long</Option>
                    <Option value="line">Lines</Option>
                  </Select>
                  <Button 
                    type="primary" 
                    icon={<PlusOutlined />}
                    onClick={() => {
                      setEditingEntry(null);
                      form.resetFields();
                      setIsModalVisible(true);
                    }}
                  >
                    Add Entry
                  </Button>
                  <Upload
                    accept=".csv,.xlsx,.xls"
                    showUploadList={false}
                    beforeUpload={handleFileUpload}
                  >
                    <Button 
                      icon={<UploadOutlined />}
                      style={{ background: '#8b5cf6', color: 'white', borderColor: '#8b5cf6' }}
                    >
                      Upload CSV/Excel
                    </Button>
                  </Upload>
                </Space>
              </Col>
            </Row>

            {/* Bulk Operations */}
            {selectedRowKeys.length > 0 && (
              <div style={{ marginTop: '16px', padding: '12px', background: '#2d3748', borderRadius: '6px' }}>
                <Space>
                  <Text style={{ color: '#e2e8f0' }}>
                    {selectedRowKeys.length} entries selected
                  </Text>
                  <Popconfirm
                    title={`Delete ${selectedRowKeys.length} selected entries?`}
                    onConfirm={handleBulkDelete}
                  >
                    <Button danger size="small" icon={<DeleteOutlined />}>
                      Bulk Delete
                    </Button>
                  </Popconfirm>
                  <Button size="small" onClick={() => setSelectedRowKeys([])}>
                    Clear Selection
                  </Button>
                </Space>
              </div>
            )}
          </Card>

          {/* Professional Data Table */}
          <Table
            columns={columns}
            dataSource={processedEntries}
            rowKey="id"
            loading={loading}
            rowSelection={rowSelection}
            pagination={{
              pageSize: 50,
              showSizeChanger: true,
              showQuickJumper: true,
              showTotal: (total, range) => 
                `${range[0]}-${range[1]} of ${total} entries`,
            }}
            scroll={{ y: 600 }}
            style={{
              background: '#1a1a1a',
              borderRadius: '8px'
            }}
            className="professional-glossary-table"
          />
        </>
      )}

      {/* Enhanced Add/Edit Modal */}
      <Modal
        title={editingEntry ? 'Edit Glossary Entry' : 'Add New Entry'}
        open={isModalVisible}
        onCancel={() => setIsModalVisible(false)}
        footer={null}
        width={600}
      >
        <Form
          form={form}
          layout="vertical"
          onFinish={handleSaveEntry}
        >
          <Form.Item
            name="source_text"
            label="Source Text"
            rules={[{ required: true, message: 'Please enter source text' }]}
          >
            <Input.TextArea 
              rows={4} 
              placeholder="Enter source text..."
              showCount
            />
          </Form.Item>
          
          <Form.Item
            name="target_text"
            label="Target Text"
            rules={[{ required: true, message: 'Please enter target text' }]}
          >
            <Input.TextArea 
              rows={4} 
              placeholder="Enter target text..."
              showCount
            />
          </Form.Item>
          
          <Form.Item style={{ marginBottom: 0 }}>
            <Space style={{ width: '100%', justifyContent: 'flex-end' }}>
              <Button onClick={() => setIsModalVisible(false)}>
                Cancel
              </Button>
              <Button type="primary" htmlType="submit">
                {editingEntry ? 'Update' : 'Add'} Entry
              </Button>
            </Space>
          </Form.Item>
        </Form>
      </Modal>

      <style>{`
        .professional-glossary-table .ant-table-thead > tr > th {
          background: #2d3748 !important;
          color: #e2e8f0 !important;
          border-bottom: 1px solid #4a5568 !important;
        }
        .professional-glossary-table .ant-table-tbody > tr > td {
          background: #1a1a1a !important;
          border-bottom: 1px solid #2d3748 !important;
        }
        .professional-glossary-table .ant-table-tbody > tr:hover > td {
          background: #2d3748 !important;
        }
        .professional-glossary-table .ant-table-tbody > tr.ant-table-row-selected > td {
          background: #3d4852 !important;
        }
      `}</style>
      
      {/* Upload Progress Modal */}
      <Modal
        title="Uploading Glossary"
        open={uploadModalVisible}
        footer={null}
        closable={!isUploading}
        onCancel={() => {
          if (!isUploading) {
            setUploadModalVisible(false);
            setUploadProgress(null);
          }
        }}
      >
        <div style={{ textAlign: 'center', padding: '20px' }}>
          {uploadProgress && (
            <>
              <Progress
                percent={uploadProgress.progress || 0}
                status={uploadProgress.status === 'failed' ? 'exception' : 'active'}
                strokeColor={{
                  '0%': '#8b5cf6',
                  '100%': '#764ba2'
                }}
              />
              
              <div style={{ marginTop: '20px' }}>
                <Text strong style={{ fontSize: '16px', display: 'block', marginBottom: '8px' }}>
                  {uploadProgress.current_phase}
                </Text>
                
                {uploadProgress.total_items > 0 && (
                  <Text type="secondary">
                    Processed {uploadProgress.items_completed} of {uploadProgress.total_items} entries
                  </Text>
                )}
              </div>
              
              {uploadProgress.status === 'completed' && (
                <div style={{ marginTop: '20px' }}>
                  <CheckOutlined style={{ fontSize: '48px', color: '#52c41a' }} />
                  <Text strong style={{ display: 'block', marginTop: '10px', color: '#52c41a' }}>
                    Upload Complete!
                  </Text>
                </div>
              )}
            </>
          )}
        </div>
      </Modal>
    </div>
  );
};

export default ProfessionalGlossaryManager;