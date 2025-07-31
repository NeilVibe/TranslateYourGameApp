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
  CheckOutlined, SaveOutlined, CloseOutlined, ExclamationCircleOutlined
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
  is_public?: boolean;
  source_language?: string;
  target_language?: string;
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
  
  // Enhanced Search & Filter with Debouncing
  const [searchText, setSearchText] = useState('');
  const [debouncedSearchText, setDebouncedSearchText] = useState('');
  const [searchMode, setSearchMode] = useState<'contains' | 'exact' | 'embedding'>('contains');
  const [selectedRowKeys, setSelectedRowKeys] = useState<number[]>([]);
  const [isSearching, setIsSearching] = useState(false);
  
  // Upload state (simplified - no blocking modal)
  const [isUploading, setIsUploading] = useState(false);
  
  // Create Glossary Modal state
  const [isCreateGlossaryModalVisible, setIsCreateGlossaryModalVisible] = useState(false);
  const [createGlossaryForm] = Form.useForm();
  
  // Edit Glossary Modal state
  const [isEditGlossaryModalVisible, setIsEditGlossaryModalVisible] = useState(false);
  const [editGlossaryForm] = Form.useForm();
  
  // Embedding search results
  const [embeddingSearchResults, setEmbeddingSearchResults] = useState<GlossaryEntry[]>([]);

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

  // Debounce search input (300ms delay to eliminate keystroke lag)
  useEffect(() => {
    const timer = setTimeout(() => {
      setDebouncedSearchText(searchText);
      setIsSearching(false);
    }, 300);

    // Show searching state for immediate feedback
    if (searchText !== debouncedSearchText) {
      setIsSearching(true);
    }

    return () => clearTimeout(timer);
  }, [searchText, debouncedSearchText]);

  // Trigger embedding search when search mode is embedding and we have debounced text
  useEffect(() => {
    if (searchMode === 'embedding' && debouncedSearchText.trim()) {
      performEmbeddingSearch(debouncedSearchText).then(results => {
        setEmbeddingSearchResults(results);
      });
    } else {
      setEmbeddingSearchResults([]);
    }
  }, [searchMode, debouncedSearchText, selectedGlossary]);

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

  // Enhanced search processing with debouncing and embedding support
  const processedEntries = useMemo(() => {
    // If embedding mode and we have search results, use those
    if (searchMode === 'embedding' && debouncedSearchText.trim() && embeddingSearchResults.length > 0) {
      return embeddingSearchResults;
    }
    
    // Otherwise filter normally
    let filtered = entries.filter(entry => {
      if (debouncedSearchText === '') return true;
      
      const searchLower = debouncedSearchText.toLowerCase();
      const sourceLower = entry.source_text.toLowerCase();
      const targetLower = entry.target_text.toLowerCase();
      
      switch (searchMode) {
        case 'exact':
          return sourceLower === searchLower || targetLower === searchLower;
        case 'contains':
        default:
          return sourceLower.includes(searchLower) || targetLower.includes(searchLower);
      }
    });

    // Sort by length (shortest first) by default
    filtered.sort((a, b) => a.source_text.length - b.source_text.length);
    return filtered;
  }, [entries, debouncedSearchText, searchMode, embeddingSearchResults]);

  // Real embedding search function using actual API
  const performEmbeddingSearch = async (query: string): Promise<GlossaryEntry[]> => {
    if (!selectedGlossary || !query.trim()) return [];
    
    try {
      setIsSearching(true);
      const response = await fetch(`${apiBaseUrl}/glossaries/${selectedGlossary.id}/embedding-search`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'X-API-Key': apiKey
        },
        body: JSON.stringify({
          text: query,
          top_k: 50
        })
      });
      
      if (response.ok) {
        const data = await response.json();
        if (data.status === 'success' && data.data?.similar_entries) {
          return data.data.similar_entries.map((item: any) => ({
            id: item.entry_id,
            source_text: item.source_text,
            target_text: item.target_text,
            created_at: item.created_at || '',
            similarity_score: item.similarity_score
          }));
        }
      }
    } catch (error) {
      console.error('Embedding search error:', error);
      message.error('Semantic search failed, falling back to text search');
    } finally {
      setIsSearching(false);
    }
    return [];
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

  // Delete entire glossary
  const handleDeleteGlossary = async (glossaryToDelete: Glossary) => {
    try {
      const response = await fetch(`${apiBaseUrl}/glossaries/${glossaryToDelete.id}`, {
        method: 'DELETE',
        headers: { 'X-API-Key': apiKey }
      });
      
      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.message || 'Failed to delete glossary');
      }
      
      const result = await response.json();
      message.success(`Deleted glossary "${glossaryToDelete.name}" with ${result.data.entries_deleted} entries`);
      
      // Clear selection if we deleted the currently selected glossary
      if (selectedGlossary?.id === glossaryToDelete.id) {
        setSelectedGlossary(null);
        setEntries([]);
      }
      
      // Reload glossaries list
      loadGlossaries();
    } catch (error) {
      console.error('Error deleting glossary:', error);
      message.error(`Failed to delete glossary: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  };

  // Rename/update glossary
  const handleUpdateGlossary = async (values: any) => {
    if (!selectedGlossary) return;
    
    try {
      const response = await fetch(`${apiBaseUrl}/glossaries/${selectedGlossary.id}`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
          'X-API-Key': apiKey
        },
        body: JSON.stringify({
          name: values.name,
          description: values.description || ''
        })
      });
      
      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.message || 'Failed to update glossary');
      }
      
      const result = await response.json();
      message.success(`Updated glossary "${values.name}"`);
      
      // Update local state
      setSelectedGlossary(result.data);
      
      // Reload glossaries list to reflect changes
      loadGlossaries();
    } catch (error) {
      console.error('Error updating glossary:', error);
      message.error(`Failed to update glossary: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  };

  // Create new glossary
  const handleCreateGlossary = async (values: any) => {
    try {
      setLoading(true);
      const response = await fetch(`${apiBaseUrl}/glossaries`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'X-API-Key': apiKey
        },
        body: JSON.stringify({
          name: values.name,
          description: values.description || '',
          source_language: values.source_language || 'ko',
          target_language: values.target_language || 'en'
        })
      });

      if (!response.ok) throw new Error('Failed to create glossary');

      const data = await response.json();
      if (data.status === 'success') {
        message.success('Glossary created successfully!');
        setIsCreateGlossaryModalVisible(false);
        createGlossaryForm.resetFields();
        
        // Reload glossaries and select the new one
        await loadGlossaries();
        const newGlossary = glossaries.find(g => g.name === values.name);
        if (newGlossary) {
          setSelectedGlossary(newGlossary);
        }
      }
    } catch (error) {
      console.error('Error creating glossary:', error);
      message.error('Failed to create glossary');
    } finally {
      setLoading(false);
    }
  };

  // Individual CRUD operations
  const handleFileUpload = async (file: File) => {
    if (!selectedGlossary) return false;
    
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
        // NEW UX PATTERN: Immediate notification + neutral state
        message.success({
          content: 'Glossary upload started!',
          duration: 4,
          style: { marginTop: '10vh' }
        });
        
        // Show sliding notification with Tasks tab link
        const taskId = data.data.task_id.substring(0, 8);
        const key = `upload-${taskId}`;
        
        message.info({
          key,
          content: (
            <div>
              <div>Processing {file.name} in background</div>
              <div style={{ marginTop: '8px' }}>
                <Button 
                  type="link" 
                  size="small" 
                  onClick={() => {
                    message.destroy(key);
                    // Could trigger tab change here if needed
                  }}
                  style={{ padding: 0, height: 'auto' }}
                >
                  View in Tasks tab →
                </Button>
              </div>
            </div>
          ),
          duration: 6,
          style: { marginTop: '15vh' }
        });
        
        // Reload data after successful start (optimistic UI)
        setTimeout(() => {
          loadGlossaries();
        }, 1000);
        
      } else {
        throw new Error(data.message || 'Upload failed');
      }
      
    } catch (error) {
      console.error('Upload error:', error);
      message.error('Failed to start glossary upload');
    }
    
    return false; // Prevent default upload behavior
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
      {/* Compact Glossary Selector with Add New Button */}
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
        
        {/* NEW: Add New Glossary Button */}
        <Button 
          type="primary" 
          icon={<PlusOutlined />}
          onClick={() => setIsCreateGlossaryModalVisible(true)}
          style={{ 
            background: '#10b981', 
            borderColor: '#10b981',
            fontWeight: 'bold'
          }}
          size="large"
        >
          Add New Glossary
        </Button>
        
        {/* Edit and Delete Glossary Buttons - only show when glossary is selected */}
        {selectedGlossary && (
          <>
            <Button 
              icon={<EditOutlined />}
              onClick={() => {
                editGlossaryForm.setFieldsValue({
                  name: selectedGlossary.name,
                  description: selectedGlossary.description || ''
                });
                setIsEditGlossaryModalVisible(true);
              }}
              size="large"
              style={{ 
                fontWeight: 'bold',
                background: '#3b82f6',
                borderColor: '#3b82f6',
                color: 'white'
              }}
            >
              Edit Glossary
            </Button>
            
            <Popconfirm
              title={`Delete "${selectedGlossary.name}"?`}
              description={`This will permanently delete the glossary and all ${selectedGlossary.entry_count} entries. This action cannot be undone.`}
              onConfirm={() => handleDeleteGlossary(selectedGlossary)}
              okText="Delete"
              cancelText="Cancel"
              okType="danger"
              icon={<ExclamationCircleOutlined style={{ color: 'red' }} />}
            >
              <Button 
                danger
                icon={<DeleteOutlined />}
                size="large"
                style={{ fontWeight: 'bold' }}
              >
                Delete Glossary
              </Button>
            </Popconfirm>
          </>
        )}
        
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
              suffix={isSearching ? <SearchOutlined spin /> : <SearchOutlined />}
            />
            <Select
              value={searchMode}
              onChange={setSearchMode}
              style={{ width: 160 }}
              size="large"
            >
              <Option value="contains">Text Search</Option>
              <Option value="exact">Exact Match</Option>
              <Option value="embedding">Semantic Search</Option>
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
              accept=".csv,.xlsx,.xls,.json,.xml,.po,.pot"
              showUploadList={false}
              beforeUpload={handleFileUpload}
            >
              <Button 
                icon={<UploadOutlined />}
                style={{ background: '#8b5cf6', color: 'white', borderColor: '#8b5cf6' }}
                size="large"
              >
                Upload File
              </Button>
            </Upload>
          </div>

          {/* Search Results Indicator */}
          {debouncedSearchText && (
            <div style={{ marginBottom: '12px', color: '#8b5cf6', fontSize: '14px' }}>
              <SearchOutlined style={{ marginRight: '8px' }} />
              {processedEntries.length} {processedEntries.length === 1 ? 'result' : 'results'} found
              {searchMode === 'embedding' && (
                <Tag color="blue" style={{ marginLeft: '8px' }}>AI-Powered</Tag>
              )}
            </div>
          )}

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

      {/* Create Glossary Modal */}
      <Modal
        title="Create New Glossary"
        open={isCreateGlossaryModalVisible}
        onCancel={() => {
          setIsCreateGlossaryModalVisible(false);
          createGlossaryForm.resetFields();
        }}
        footer={null}
        width={600}
      >
        <Form
          form={createGlossaryForm}
          layout="vertical"
          onFinish={handleCreateGlossary}
        >
          <Form.Item
            name="name"
            label="Glossary Name"
            rules={[
              { required: true, message: 'Please enter glossary name' },
              { min: 2, message: 'Name must be at least 2 characters' },
              { max: 100, message: 'Name must be less than 100 characters' }
            ]}
          >
            <Input 
              placeholder="e.g., Game UI Terms, Character Names, etc."
              size="large"
            />
          </Form.Item>
          
          <Form.Item
            name="description"
            label="Description (Optional)"
          >
            <Input.TextArea 
              rows={3} 
              placeholder="Brief description of this glossary..."
              showCount
              maxLength={500}
            />
          </Form.Item>
          
          <Form.Item
            name="source_language"
            label="Source Language"
            initialValue="ko"
          >
            <Select size="large">
              <Option value="ko">Korean (한국어)</Option>
              <Option value="en">English</Option>
              <Option value="ja">Japanese (日本語)</Option>
              <Option value="zh">Chinese (中文)</Option>
              <Option value="fr">French (Français)</Option>
              <Option value="de">German (Deutsch)</Option>
              <Option value="es">Spanish (Español)</Option>
              <Option value="it">Italian (Italiano)</Option>
            </Select>
          </Form.Item>
          
          <Form.Item
            name="target_language"
            label="Target Language"
            initialValue="en"
          >
            <Select size="large">
              <Option value="en">English</Option>
              <Option value="ko">Korean (한국어)</Option>
              <Option value="ja">Japanese (日本語)</Option>
              <Option value="zh">Chinese (中文)</Option>
              <Option value="fr">French (Français)</Option>
              <Option value="de">German (Deutsch)</Option>
              <Option value="es">Spanish (Español)</Option>
              <Option value="it">Italian (Italiano)</Option>
            </Select>
          </Form.Item>
          
          <Form.Item style={{ marginBottom: 0 }}>
            <Space style={{ width: '100%', justifyContent: 'flex-end' }}>
              <Button onClick={() => {
                setIsCreateGlossaryModalVisible(false);
                createGlossaryForm.resetFields();
              }}>
                Cancel
              </Button>
              <Button 
                type="primary" 
                htmlType="submit"
                loading={loading}
                style={{ 
                  background: '#10b981', 
                  borderColor: '#10b981' 
                }}
              >
                Create Glossary
              </Button>
            </Space>
          </Form.Item>
        </Form>
      </Modal>

      {/* Edit Glossary Modal */}
      <Modal
        title="Edit Glossary"
        open={isEditGlossaryModalVisible}
        onCancel={() => {
          setIsEditGlossaryModalVisible(false);
          editGlossaryForm.resetFields();
        }}
        footer={null}
        width={600}
      >
        <Form
          form={editGlossaryForm}
          layout="vertical"
          onFinish={(values) => {
            handleUpdateGlossary(values);
            setIsEditGlossaryModalVisible(false);
          }}
        >
          <Form.Item
            name="name"
            label="Glossary Name"
            rules={[
              { required: true, message: 'Please enter glossary name' },
              { min: 2, message: 'Name must be at least 2 characters' },
              { max: 100, message: 'Name must be less than 100 characters' }
            ]}
          >
            <Input 
              placeholder="e.g., Game UI Terms, Character Names, etc."
              size="large"
            />
          </Form.Item>
          
          <Form.Item
            name="description"
            label="Description (Optional)"
          >
            <Input.TextArea 
              rows={3} 
              placeholder="Brief description of this glossary..."
              showCount
              maxLength={500}
            />
          </Form.Item>
          
          <Form.Item style={{ marginBottom: 0 }}>
            <Space style={{ width: '100%', justifyContent: 'flex-end' }}>
              <Button onClick={() => {
                setIsEditGlossaryModalVisible(false);
                editGlossaryForm.resetFields();
              }}>
                Cancel
              </Button>
              <Button 
                type="primary" 
                htmlType="submit"
                loading={loading}
                style={{ 
                  background: '#3b82f6', 
                  borderColor: '#3b82f6' 
                }}
              >
                Update Glossary
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
      
    </div>
  );
};

export default ProfessionalGlossaryManager;