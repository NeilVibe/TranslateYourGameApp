import React, { useState, useEffect, useCallback, useMemo } from 'react';
import { useTranslation } from 'react-i18next';
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
  entry_type?: string;
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
  const { t } = useTranslation(['glossary', 'common']);
  
  // State Management
  const [glossaries, setGlossaries] = useState<Glossary[]>([]);
  const [selectedGlossary, setSelectedGlossary] = useState<Glossary | null>(null);
  const [entries, setEntries] = useState<GlossaryEntry[]>([]);
  const [loading, setLoading] = useState(false);
  const [currentPage, setCurrentPage] = useState(1);
  const [hasMoreEntries, setHasMoreEntries] = useState(true);
  const [isModalVisible, setIsModalVisible] = useState(false);
  const [editingEntry, setEditingEntry] = useState<GlossaryEntry | null>(null);
  const [inlineEditingId, setInlineEditingId] = useState<number | null>(null);
  const [inlineEditValue, setInlineEditValue] = useState<{source: string, target: string}>({source: '', target: ''});
  const [form] = Form.useForm();
  
  // Enhanced Search & Filter
  const [searchText, setSearchText] = useState('');
  const [searchMode, setSearchMode] = useState<'contains' | 'exact' | 'embedding'>('contains');
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
      setEntries([]);
      setCurrentPage(1);
      setHasMoreEntries(true);
      loadGlossaryEntries(selectedGlossary.id, 1, true);
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

  const loadGlossaryEntries = async (glossaryId: number, page: number = 1, reset: boolean = false) => {
    try {
      setLoading(true);
      const response = await fetch(`${apiBaseUrl}/glossaries/${glossaryId}/entries?include_line_entries=true&page=${page}&per_page=50`, {
        headers: { 'X-API-Key': apiKey }
      });
      
      if (!response.ok) throw new Error('Failed to load entries');
      
      const data = await response.json();
      if (data.status === 'success' && data.data) {
        const entriesWithMetadata = (data.data.entries || []).map((entry: GlossaryEntry) => ({
          ...entry,
          character_count: entry.source_text.length,
          is_line_entry: entry.entry_type === 'line' // Use actual entry type from API
        }));
        
        if (reset) {
          setEntries(entriesWithMetadata);
        } else {
          setEntries(prev => [...prev, ...entriesWithMetadata]);
        }
        
        // Check if there are more entries
        setHasMoreEntries(entriesWithMetadata.length === 50);
        setCurrentPage(page);
      }
    } catch (error) {
      console.error('Error loading entries:', error);
      message.error('Failed to load glossary entries');
    } finally {
      setLoading(false);
    }
  };

  // Enhanced search processing with embedding support
  const processedEntries = useMemo(() => {
    let filtered = entries.filter(entry => {
      if (searchText === '') return true;
      
      const searchLower = searchText.toLowerCase();
      const sourceLower = entry.source_text.toLowerCase();
      const targetLower = entry.target_text.toLowerCase();
      
      switch (searchMode) {
        case 'exact':
          return sourceLower === searchLower || targetLower === searchLower;
        case 'embedding':
          // For embedding search, we'll use contains for now but mark it for API implementation
          // TODO: Implement embedding search via embeddings API endpoint
          return sourceLower.includes(searchLower) || targetLower.includes(searchLower);
        case 'contains':
        default:
          return sourceLower.includes(searchLower) || targetLower.includes(searchLower);
      }
    });

    // Sort by length (shortest first) by default
    filtered.sort((a, b) => a.source_text.length - b.source_text.length);
    return filtered;
  }, [entries, searchText, searchMode]);

  // Embedding search function (future implementation)
  const performEmbeddingSearch = async (query: string) => {
    try {
      // This would call the embedding search API endpoint
      const response = await fetch(`${apiBaseUrl}/glossaries/${selectedGlossary?.id}/search`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${apiKey}`
        },
        body: JSON.stringify({
          query: query,
          search_type: 'embedding'
        })
      });
      
      if (response.ok) {
        const results = await response.json();
        return results;
      }
    } catch (error) {
      console.error('Embedding search error:', error);
    }
    return null;
  };

  // Inline editing handlers
  const startInlineEdit = (entry: GlossaryEntry) => {
    setInlineEditingId(entry.id);
    setInlineEditValue({
      source: entry.source_text,
      target: entry.target_text.replace(/\n/g, '\\n')  // Convert actual newlines to escaped for consistent editing
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
          target_text: inlineEditValue.target.replace(/\\n/g, '\n')  // Convert escaped back to actual newlines for storage
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

  // Handle keyboard shortcuts for editing
  useEffect(() => {
    const handleKeyDown = (event: KeyboardEvent) => {
      if (inlineEditingId !== null) {
        if (event.key === 'Escape') {
          cancelInlineEdit();
        } else if (event.key === 'Enter' && event.ctrlKey) {
          // Ctrl+Enter to save
          saveInlineEdit();
        }
      }
    };

    document.addEventListener('keydown', handleKeyDown);
    return () => {
      document.removeEventListener('keydown', handleKeyDown);
    };
  }, [inlineEditingId]);

  // Handle scroll to load more entries
  const handleTableScroll = useCallback((e: any) => {
    const { target } = e;
    if (target.scrollTop + target.clientHeight >= target.scrollHeight - 10) {
      // Near bottom, load more if available
      if (hasMoreEntries && !loading && selectedGlossary) {
        loadGlossaryEntries(selectedGlossary.id, currentPage + 1, false);
      }
    }
  }, [hasMoreEntries, loading, selectedGlossary, currentPage]);

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
      width: '42%',
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
            <Text style={{ whiteSpace: 'pre-wrap' }}>{text.replace(/\\n/g, '\n')}</Text>
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
      width: '42%',
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
            <Text style={{ whiteSpace: 'pre-wrap' }}>{text.replace(/\\n/g, '\n')}</Text>
          </div>
        );
      },
    },
    {
      title: 'Actions',
      key: 'actions',
      width: '16%',
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
            <Tooltip title={t('glossary:table.click_to_edit')}>
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
      {/* Compact Glossary Selector */}
      <div style={{ marginBottom: '20px', display: 'flex', alignItems: 'center', gap: '16px', flexWrap: 'wrap' }}>
        <Select
          value={selectedGlossary?.id}
          onChange={(id) => setSelectedGlossary(glossaries.find(g => g.id === id) || null)}
          style={{ minWidth: '300px', flex: 1, maxWidth: '500px' }}
          placeholder={t('glossary:placeholders.choose_glossary')}
        >
          {glossaries.map((glossary) => (
            <Option key={glossary.id} value={glossary.id}>
              {glossary.name} ({glossary.entry_count} entries)
            </Option>
          ))}
        </Select>
        {selectedGlossary && (
          <Text style={{ color: '#8b5cf6', fontSize: '14px', fontWeight: 'bold' }}>
            Total: {entries.length} entries
          </Text>
        )}
      </div>

      {selectedGlossary && (
        <>
          {/* Search and Controls */}
          <div style={{ marginBottom: '16px', display: 'flex', gap: '12px', alignItems: 'center', flexWrap: 'wrap' }}>
            <Input
              placeholder={t('glossary:placeholders.search_entries')}
              value={searchText}
              onChange={(e) => setSearchText(e.target.value)}
              style={{ 
                minWidth: '400px', 
                flex: 2, 
                maxWidth: '700px'
              }}
              allowClear
              size="large"
            />
            <Select
              value={searchMode}
              onChange={setSearchMode}
              style={{ width: 140 }}
              size="large"
            >
              <Option value="contains">Contains</Option>
              <Option value="exact">Exact Match</Option>
              <Option value="embedding">AI Search</Option>
            </Select>
            <Button 
              type="primary" 
              icon={<PlusOutlined />}
              onClick={() => {
                setEditingEntry(null);
                form.resetFields();
                setIsModalVisible(true);
              }}
              size="large"
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
                size="large"
              >
                Upload CSV/Excel
              </Button>
            </Upload>
          </div>

          {/* Bulk Operations */}
          {selectedRowKeys.length > 0 && (
            <div style={{ marginBottom: '16px', padding: '12px', background: '#2d3748', borderRadius: '6px' }}>
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

          {/* Data Table */}
          <Table
            columns={columns}
            dataSource={processedEntries}
            rowKey="id"
            loading={loading}
            rowSelection={rowSelection}
            pagination={false}
            scroll={{ y: 600 }}
            onScroll={handleTableScroll}
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
            label={t('glossary:table.source_text')}
            rules={[{ required: true, message: 'Please enter source text' }]}
          >
            <Input.TextArea 
              rows={4} 
              placeholder={t('glossary:placeholders.enter_source')}
              showCount
            />
          </Form.Item>
          
          <Form.Item
            name="target_text"
            label={t('glossary:table.target_text')}
            rules={[{ required: true, message: 'Please enter target text' }]}
          >
            <Input.TextArea 
              rows={4} 
              placeholder={t('glossary:placeholders.enter_target')}
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
        title={t('glossary:upload.title')}
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