import React, { useState, useEffect } from 'react';
import { Card, Table, Button, Modal, Form, Input, Select, Space, Typography, message, Popconfirm, Tag, Upload, Divider, Alert, Tabs, Badge, Progress, Tooltip, Statistic, App } from 'antd';
import { PlusOutlined, EditOutlined, DeleteOutlined, BookOutlined, SearchOutlined, UploadOutlined, InboxOutlined, ThunderboltOutlined, DatabaseOutlined, FireOutlined } from '@ant-design/icons';
import apiClient from '../services/apiClient';
import LanguageSelector from './LanguageSelector';
import * as XLSX from 'xlsx';

const { Title, Text } = Typography;
const { Option } = Select;
const { TextArea } = Input;

interface Glossary {
  id: number;
  name: string;
  description: string;
  source_language: string;
  target_language: string;
  is_public: boolean;
  entry_count: number;
  created_at: string;
  updated_at: string;
}

interface GlossaryEntry {
  id: number;
  source_text: string;
  target_text: string;
  created_at?: string;
}

interface GlossaryManagementProps {
  apiKey: string | null;
}

const GlossaryManagement: React.FC<GlossaryManagementProps> = ({ apiKey }) => {
  const { message } = App.useApp();
  const [glossaries, setGlossaries] = useState<Glossary[]>([]);
  const [loading, setLoading] = useState(false);
  const [modalVisible, setModalVisible] = useState(false);
  const [editingGlossary, setEditingGlossary] = useState<Glossary | null>(null);
  const [entriesModalVisible, setEntriesModalVisible] = useState(false);
  const [selectedGlossary, setSelectedGlossary] = useState<Glossary | null>(null);
  const [entries, setEntries] = useState<GlossaryEntry[]>([]);
  const [entryModalVisible, setEntryModalVisible] = useState(false);
  const [editingEntry, setEditingEntry] = useState<GlossaryEntry | null>(null);
  const [uploadedEntries, setUploadedEntries] = useState<{source_text: string, target_text: string}[]>([]);
  const [uploadMode, setUploadMode] = useState<'manual' | 'file'>('manual');
  const [searchText, setSearchText] = useState('');
  const [searchType, setSearchType] = useState<'contains' | 'exact'>('contains');
  const [entriesLoading, setEntriesLoading] = useState(false);
  const [importModalVisible, setImportModalVisible] = useState(false);
  const [importEntries, setImportEntries] = useState<{source_text: string, target_text: string}[]>([]);
  
  // Embedding search states
  const [embeddingSearchText, setEmbeddingSearchText] = useState('');
  const [embeddingResults, setEmbeddingResults] = useState<any[]>([]);
  const [embeddingLoading, setEmbeddingLoading] = useState(false);
  const [embeddingTopK, setEmbeddingTopK] = useState(10);
  const [embeddingSearchStats, setEmbeddingSearchStats] = useState<any>(null);
  const [activeSearchTab, setActiveSearchTab] = useState('1'); // '1' for text search, '2' for embedding search
  
  // Create form instances (warning in dev mode is expected due to React Strict Mode)
  const [form] = Form.useForm();
  const [entryForm] = Form.useForm();


  const languages = [
    { code: 'en', name: 'English' },
    { code: 'ko', name: '한국어 (Korean)' },
    { code: 'ja', name: '日本語 (Japanese)' },
    { code: 'fr', name: 'Français (French)' },
    { code: 'es', name: 'Español (Spanish)' },
    { code: 'de', name: 'Deutsch (German)' },
    { code: 'it', name: 'Italiano (Italian)' },
    { code: 'pt', name: 'Português (Portuguese)' },
    { code: 'ru', name: 'Русский (Russian)' },
    { code: 'zh', name: '中文 (Chinese)' }
  ];

  useEffect(() => {
    if (apiKey) {
      loadGlossaries();
    }
  }, [apiKey]);

  const loadGlossaries = async () => {
    setLoading(true);
    try {
      const response = await apiClient.getGlossaries();
      // API returns {data: {glossaries: [...], total_count: ...}}
      setGlossaries(response.data.glossaries || []);
    } catch (error: any) {
      message.error(`Failed to load glossaries: ${error.message}`);
      setGlossaries([]); // Set empty array on error
    } finally {
      setLoading(false);
    }
  };

  const handleCreateGlossary = () => {
    setEditingGlossary(null);
    setUploadMode('manual');
    setUploadedEntries([]);
    form.resetFields();
    setModalVisible(true);
  };

  const handleEditGlossary = (glossary: Glossary) => {
    setEditingGlossary(glossary);
    form.setFieldsValue(glossary);
    setModalVisible(true);
  };

  const handleSaveGlossary = async (values: any) => {
    try {
      let glossaryId;
      if (editingGlossary) {
        await apiClient.updateGlossary(editingGlossary.id, values);
        glossaryId = editingGlossary.id;
        message.success('Glossary updated successfully');
      } else {
        const response = await apiClient.createGlossary(values);
        glossaryId = response.data.id;
        message.success('Glossary created successfully');
        
        // If we have uploaded entries, add them to the new glossary
        if (uploadMode === 'file' && uploadedEntries.length > 0) {
          try {
            for (const entry of uploadedEntries) {
              await apiClient.addGlossaryEntry(glossaryId, entry);
            }
            message.success(`Added ${uploadedEntries.length} entries from file`);
          } catch (error: any) {
            message.warning(`Glossary created but failed to add some entries: ${error.message}`);
          }
        }
      }
      setModalVisible(false);
      setUploadedEntries([]);
      loadGlossaries();
    } catch (error: any) {
      message.error(`Failed to save glossary: ${error.message}`);
    }
  };

  const parseCSVFile = (content: string): {source_text: string, target_text: string}[] => {
    const lines = content.split('\n').filter(line => line.trim());
    const entries: {source_text: string, target_text: string}[] = [];
    
    // Parse all lines - no headers expected
    for (let i = 0; i < lines.length; i++) {
      const line = lines[i].trim();
      if (!line) continue;
      
      // Simple CSV parsing - split by comma, handle basic quoted fields
      const columns = line.split(',').map(col => col.trim().replace(/^"(.*)"$/, '$1'));
      
      if (columns.length >= 2 && columns[0] && columns[1]) {
        entries.push({
          source_text: columns[0],
          target_text: columns[1]
        });
      }
    }
    
    return entries;
  };

  const parseExcelFile = (arrayBuffer: ArrayBuffer): {source_text: string, target_text: string}[] => {
    try {
      const workbook = XLSX.read(arrayBuffer, { type: 'array' });
      const firstSheetName = workbook.SheetNames[0];
      const worksheet = workbook.Sheets[firstSheetName];
      
      // Convert to JSON array
      const jsonData = XLSX.utils.sheet_to_json(worksheet, { header: 1 });
      const entries: {source_text: string, target_text: string}[] = [];
      
      for (const row of jsonData as any[][]) {
        if (row && row.length >= 2) {
          const sourceText = String(row[0] || '').trim();
          const targetText = String(row[1] || '').trim();
          
          // Skip empty rows
          if (sourceText && targetText) {
            entries.push({
              source_text: sourceText,
              target_text: targetText
            });
          }
        }
      }
      
      return entries;
    } catch (error) {
      console.error('Error parsing Excel file:', error);
      throw new Error('Failed to parse Excel file. Please check the format.');
    }
  };

  const handleFileUpload = (file: File) => {
    const fileName = file.name.toLowerCase();
    let entries: {source_text: string, target_text: string}[] = [];
    
    if (fileName.endsWith('.csv') || file.type === 'text/csv') {
      // Handle CSV files
      const reader = new FileReader();
      reader.onload = (e) => {
        try {
          const content = e.target?.result as string;
          entries = parseCSVFile(content);
          
          if (entries.length === 0) {
            message.warning('No valid entries found in file. Make sure your CSV has 2 columns per row: source term, target term (no headers)');
            return;
          }
          
          setUploadedEntries(entries);
          message.success(`Loaded ${entries.length} entries from CSV file`);
        } catch (error) {
          message.error('Failed to parse CSV file. Please check the format.');
        }
      };
      reader.readAsText(file);
    } else if (fileName.endsWith('.xlsx') || fileName.endsWith('.xls') || 
               file.type === 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet' ||
               file.type === 'application/vnd.ms-excel') {
      // Handle Excel files
      const reader = new FileReader();
      reader.onload = (e) => {
        try {
          const arrayBuffer = e.target?.result as ArrayBuffer;
          entries = parseExcelFile(arrayBuffer);
          
          if (entries.length === 0) {
            message.warning('No valid entries found in file. Make sure your Excel file has 2 columns per row: source term, target term (no headers)');
            return;
          }
          
          setUploadedEntries(entries);
          message.success(`Loaded ${entries.length} entries from Excel file`);
        } catch (error) {
          message.error('Failed to parse Excel file. Please check the format.');
        }
      };
      reader.readAsArrayBuffer(file);
    } else {
      message.error('Only CSV (.csv) and Excel (.xlsx, .xls) files are supported');
      return;
    }
    
    return false; // Prevent upload
  };

  const handleImportFileUpload = (file: File) => {
    const fileName = file.name.toLowerCase();
    let entries: {source_text: string, target_text: string}[] = [];
    
    if (fileName.endsWith('.csv') || file.type === 'text/csv') {
      // Handle CSV files
      const reader = new FileReader();
      reader.onload = (e) => {
        try {
          const content = e.target?.result as string;
          entries = parseCSVFile(content);
          
          if (entries.length === 0) {
            message.warning('No valid entries found in file. Make sure your CSV has 2 columns per row: source term, target term (no headers)');
            return;
          }
          
          setImportEntries(entries);
          message.success(`Loaded ${entries.length} entries from CSV file`);
        } catch (error) {
          message.error('Failed to parse CSV file. Please check the format.');
        }
      };
      reader.readAsText(file);
    } else if (fileName.endsWith('.xlsx') || fileName.endsWith('.xls') || 
               file.type === 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet' ||
               file.type === 'application/vnd.ms-excel') {
      // Handle Excel files
      const reader = new FileReader();
      reader.onload = (e) => {
        try {
          const arrayBuffer = e.target?.result as ArrayBuffer;
          entries = parseExcelFile(arrayBuffer);
          
          if (entries.length === 0) {
            message.warning('No valid entries found in file. Make sure your Excel file has 2 columns per row: source term, target term (no headers)');
            return;
          }
          
          setImportEntries(entries);
          message.success(`Loaded ${entries.length} entries from Excel file`);
        } catch (error) {
          message.error('Failed to parse Excel file. Please check the format.');
        }
      };
      reader.readAsArrayBuffer(file);
    } else {
      message.error('Only CSV (.csv) and Excel (.xlsx, .xls) files are supported');
      return;
    }
    
    return false; // Prevent upload
  };

  const handleImportEntries = async () => {
    if (!selectedGlossary || importEntries.length === 0) {
      message.error('No entries to import');
      return;
    }

    try {
      // Use the bulk add endpoint which has auto-update logic
      const entriesData = importEntries.map(entry => ({
        source_text: entry.source_text,
        target_text: entry.target_text
      }));

      const response = await apiClient.addGlossaryEntries(selectedGlossary.id, entriesData);
      
      message.success(`Successfully imported ${importEntries.length} entries. ${response.data.entries_added} new, ${response.data.entries_updated} updated.`);
      
      setImportModalVisible(false);
      setImportEntries([]);
      loadEntries(selectedGlossary.id); // Reload entries
      loadGlossaries(); // Reload glossaries to update counts
    } catch (error: any) {
      message.error(`Failed to import entries: ${error.message}`);
    }
  };

  const handleDeleteGlossary = async (id: number) => {
    try {
      await apiClient.deleteGlossary(id);
      message.success('Glossary deleted successfully');
      loadGlossaries();
    } catch (error: any) {
      message.error(`Failed to delete glossary: ${error.message}`);
    }
  };

  const handleViewEntries = async (glossary: Glossary) => {
    setSelectedGlossary(glossary);
    setSearchText('');
    setSearchType('contains');
    setEntriesModalVisible(true);
    loadEntries(glossary.id);
  };

  const loadEntries = async (glossaryId: number, search?: string, searchTypeParam?: 'contains' | 'exact') => {
    setEntriesLoading(true);
    try {
      const response = await apiClient.getGlossaryEntries(glossaryId, {
        search: search || searchText,
        searchType: searchTypeParam || searchType,
        includeLineEntries: true,  // Always include line entries
        perPage: 500  // Get all entries at once (API max is 500)
      });
      
      let allEntries = response.data.entries || [];
      
      // DEBUG: Log the API response
      console.log('API RESPONSE:', response.data);
      console.log('ALL ENTRIES:', allEntries);
      console.log('ENTRIES BY TYPE:', {
        whole: allEntries.filter((e: any) => e.entry_type === 'whole').length,
        line: allEntries.filter((e: any) => e.entry_type === 'line').length,
        total: allEntries.length
      });
      
      // Sort by text length (shortest to longest)
      allEntries.sort((a: any, b: any) => {
        const aText = a.source_text || '';
        const bText = b.source_text || '';
        return aText.length - bText.length;
      });
      
      console.log('AFTER SORTING:', allEntries.slice(0, 10)); // Show first 10 entries
      
      setEntries(allEntries);
    } catch (error: any) {
      message.error(`Failed to load entries: ${error.message}`);
      setEntries([]); // Set empty array on error
    } finally {
      setEntriesLoading(false);
    }
  };

  const handleSearch = () => {
    if (selectedGlossary) {
      loadEntries(selectedGlossary.id, searchText, searchType);
    }
  };

  const handleClearSearch = () => {
    setSearchText('');
    setSearchType('contains');
    if (selectedGlossary) {
      loadEntries(selectedGlossary.id, '', 'contains');
    }
  };

  const handleAddEntry = () => {
    setEditingEntry(null);
    entryForm.resetFields();
    setEntryModalVisible(true);
  };

  const handleEditEntry = (entry: GlossaryEntry) => {
    setEditingEntry(entry);
    entryForm.setFieldsValue(entry);
    setEntryModalVisible(true);
  };

  const handleSaveEntry = async (values: any) => {
    if (!selectedGlossary) return;

    try {
      if (editingEntry) {
        // Update existing entry
        await apiClient.updateGlossaryEntry(selectedGlossary.id, editingEntry.id, values);
        message.success('Entry updated successfully');
      } else {
        // Create new entry
        await apiClient.addGlossaryEntry(selectedGlossary.id, values);
        message.success('Entry added successfully');
      }
      
      setEntryModalVisible(false);
      setEditingEntry(null);
      // Reload entries
      const response = await apiClient.getGlossaryEntries(selectedGlossary.id, {
        includeLineEntries: true
      });
      setEntries(response.data.entries || []);
      loadGlossaries(); // Refresh entry count
    } catch (error: any) {
      message.error(`Failed to save entry: ${error.message}`);
    }
  };

  const handleDeleteEntry = async (entryId: number) => {
    if (!selectedGlossary) return;

    try {
      await apiClient.deleteGlossaryEntry(selectedGlossary.id, entryId);
      message.success('Entry deleted successfully');
      // Reload entries
      const response = await apiClient.getGlossaryEntries(selectedGlossary.id, {
        includeLineEntries: true
      });
      setEntries(response.data.entries || []);
      loadGlossaries(); // Refresh entry count
    } catch (error: any) {
      message.error(`Failed to delete entry: ${error.message}`);
    }
  };

  const handleEmbeddingSearch = async () => {
    if (!selectedGlossary || !embeddingSearchText.trim()) {
      message.warning('Please enter search text');
      return;
    }

    setEmbeddingLoading(true);
    try {
      const response = await apiClient.embeddingSearchGlossary(
        selectedGlossary.id,
        embeddingSearchText.trim(),
        embeddingTopK
      );
      
      if (response.status === 'success') {
        // Clean results to avoid circular references
        const cleanResults = response.data.results.map((result: any) => ({
          id: result.id,
          source_text: result.source_text,
          target_text: result.target_text,
          similarity_score: result.similarity_score,
          tier: result.tier,
          match_type: result.match_type,
          created_at: result.created_at
        }));
        
        setEmbeddingResults(cleanResults);
        setEmbeddingSearchStats({
          search_time: response.data.search_time,
          total_found: response.data.total_found,
          search_strategy: response.data.search_strategy,
          embedding_model: response.data.embedding_model,
          embedding_dimensions: response.data.embedding_dimensions
        });
        
        message.success(`Found ${response.data.total_found} similar entries in ${response.data.search_time}s`);
      } else {
        message.error(`Embedding search failed: ${response.message}`);
        setEmbeddingResults([]);
        setEmbeddingSearchStats(null);
      }
    } catch (error: any) {
      message.error(`Embedding search error: ${error.message}`);
      setEmbeddingResults([]);
      setEmbeddingSearchStats(null);
    } finally {
      setEmbeddingLoading(false);
    }
  };

  const handleClearEmbeddingSearch = () => {
    setEmbeddingSearchText('');
    setEmbeddingResults([]);
    setEmbeddingSearchStats(null);
  };

  const glossaryColumns = [
    {
      title: 'Name',
      dataIndex: 'name',
      key: 'name',
      render: (text: string, record: Glossary) => (
        <div>
          <Text strong>{text}</Text>
          <br />
          <Text type="secondary" style={{ fontSize: '12px' }}>{record.description}</Text>
        </div>
      )
    },
    {
      title: 'Languages',
      key: 'languages',
      render: (record: Glossary) => (
        <div>
          <Tag color="blue">{record.source_language?.toUpperCase()}</Tag>
          →
          <Tag color="green">{record.target_language?.toUpperCase()}</Tag>
        </div>
      )
    },
    {
      title: 'Entries',
      dataIndex: 'entry_count',
      key: 'entry_count',
      render: (count: number) => (
        <Text strong style={{ color: '#1890ff' }}>{count || 0}</Text>
      )
    },
    {
      title: 'Visibility',
      dataIndex: 'is_public',
      key: 'is_public',
      render: (isPublic: boolean) => (
        <Tag color={isPublic ? 'green' : 'orange'}>
          {isPublic ? 'Public' : 'Private'}
        </Tag>
      )
    },
    {
      title: 'Created',
      dataIndex: 'created_at',
      key: 'created_at',
      render: (date: string) => new Date(date).toLocaleDateString()
    },
    {
      title: 'Actions',
      key: 'actions',
      render: (record: Glossary) => (
        <Space>
          <Button
            type="text"
            icon={<SearchOutlined />}
            onClick={() => handleViewEntries(record)}
            title="View entries"
          />
          <Button
            type="text"
            icon={<EditOutlined />}
            onClick={() => handleEditGlossary(record)}
            title="Edit glossary"
          />
          <Popconfirm
            title="Are you sure you want to delete this glossary?"
            onConfirm={() => handleDeleteGlossary(record.id)}
            okText="Yes"
            cancelText="No"
          >
            <Button
              type="text"
              icon={<DeleteOutlined />}
              danger
              title="Delete glossary"
            />
          </Popconfirm>
        </Space>
      )
    }
  ];

  const entryColumns = [
    {
      title: 'Type',
      key: 'entry_type',
      width: '8%',
      render: (record: any) => (
        <Tag color={record.entry_type === 'whole' ? 'blue' : 'green'} style={{ fontSize: '10px' }}>
          {record.entry_type === 'whole' ? 'WHOLE' : 'LINE'}
        </Tag>
      )
    },
    {
      title: 'Source Term',
      dataIndex: 'source_text',
      key: 'source_text',
      width: '32%',
      render: (text: string, record: any) => (
        <div>
          <div>{record.source_text}</div>
          {record.entry_type === 'line' && record.parent_source && (
            <div style={{ fontSize: '11px', color: '#666', marginTop: '4px' }}>
              From: {record.parent_source.substring(0, 50)}{record.parent_source.length > 50 ? '...' : ''}
            </div>
          )}
        </div>
      )
    },
    {
      title: 'Target Term',
      dataIndex: 'target_text',
      key: 'target_text',
      width: '32%',
      render: (text: string, record: any) => (
        <div>{record.target_text}</div>
      )
    },
    {
      title: 'Actions',
      key: 'actions',
      width: '15%',
      render: (record: any) => (
        <Space>
          {record.entry_type === 'whole' && (
            <>
              <Button
                type="text"
                icon={<EditOutlined />}
                onClick={() => handleEditEntry(record)}
                title="Edit entry"
                size="small"
              />
              <Popconfirm
                title="Delete this entry?"
                onConfirm={() => handleDeleteEntry(record.original_id)}
                okText="Yes"
                cancelText="No"
              >
                <Button
                  type="text"
                  icon={<DeleteOutlined />}
                  danger
                  size="small"
                />
              </Popconfirm>
            </>
          )}
          {record.entry_type === 'line' && (
            <Button
              type="text"
              onClick={() => {
                // Jump to parent entry - could implement this later
                message.info(`This is a line from entry ID: ${record.parent_entry_id}`);
              }}
              size="small"
              style={{ fontSize: '10px' }}
            >
              View Parent
            </Button>
          )}
        </Space>
      )
    }
  ];

  // Enhanced columns for embedding search results
  const embeddingColumns = [
    {
      title: 'Source Term',
      dataIndex: 'source_text',
      key: 'source_text',
      width: '25%'
    },
    {
      title: 'Target Term',
      dataIndex: 'target_text',
      key: 'target_text',
      width: '25%'
    },
    {
      title: 'Similarity',
      dataIndex: 'similarity_score',
      key: 'similarity_score',
      width: '15%',
      render: (score: number) => (
        <div style={{ textAlign: 'center' }}>
          <Progress 
            percent={Math.round(score * 100)} 
            size="small" 
            strokeColor={score > 0.8 ? '#52c41a' : score > 0.6 ? '#faad14' : '#ff4d4f'}
            format={(percent) => `${percent}%`}
          />
          <Text style={{ fontSize: '11px', color: '#666' }}>
            {score.toFixed(3)}
          </Text>
        </div>
      ),
      sorter: (a: any, b: any) => a.similarity_score - b.similarity_score,
      defaultSortOrder: 'descend' as const
    },
    {
      title: 'Match Type',
      dataIndex: 'tier',
      key: 'tier',
      width: '12%',
      render: (tier: string, record: any) => {
        const tierColors = {
          'Tier 1': '#52c41a', // Perfect match
          'Tier 2': '#1890ff', // High similarity
          'Tier 3': '#722ed1', // Medium similarity
          'Tier 4': '#fa8c16', // Low similarity
          'Tier 5': '#f5222d', // Very low similarity
          'unknown': '#8c8c8c'
        };
        return (
          <Tag color={tierColors[tier as keyof typeof tierColors] || tierColors.unknown}>
            {record.match_type === 'exact' ? 'EXACT' : tier || 'AI'}
          </Tag>
        );
      }
    },
    {
      title: 'Actions',
      key: 'actions',
      width: '13%',
      render: (record: any) => (
        <Space>
          <Button
            type="text"
            icon={<EditOutlined />}
            onClick={() => handleEditEntry(record)}
            title="Edit entry"
            size="small"
          />
          <Popconfirm
            title="Delete this entry?"
            onConfirm={() => handleDeleteEntry(record.id)}
            okText="Yes"
            cancelText="No"
          >
            <Button
              type="text"
              icon={<DeleteOutlined />}
              danger
              size="small"
            />
          </Popconfirm>
        </Space>
      )
    }
  ];

  if (!apiKey) {
    return (
      <div style={{ padding: '24px', textAlign: 'center' }}>
        <Card>
          <BookOutlined style={{ fontSize: '48px', color: '#d9d9d9', marginBottom: 16 }} />
          <Title level={4}>API Key Required</Title>
          <Text type="secondary">Please configure your API key to manage glossaries.</Text>
        </Card>
      </div>
    );
  }

  return (
    <div style={{ padding: '24px', maxWidth: '1200px', margin: '0 auto' }}>
      <Card title={
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
          <Title level={3} style={{ margin: 0 }}>
            Glossary Management
          </Title>
          <Button
            type="primary"
            icon={<PlusOutlined />}
            onClick={handleCreateGlossary}
          >
            Create Glossary
          </Button>
        </div>
      }>
        <Table
          columns={glossaryColumns}
          dataSource={glossaries}
          rowKey="id"
          loading={loading}
          pagination={{ pageSize: 10 }}
        />
      </Card>

      {/* Create/Edit Glossary Modal */}
      <Modal
        title={editingGlossary ? 'Edit Glossary' : 'Create Glossary'}
        open={modalVisible}
        onCancel={() => setModalVisible(false)}
        footer={null}
        width={600}
      >
        <Form
          form={form}
          layout="vertical"
          onFinish={handleSaveGlossary}
          preserve={false}
        >
          <Form.Item
            name="name"
            label="Glossary Name"
            rules={[{ required: true, message: 'Please enter glossary name' }]}
          >
            <Input placeholder="e.g., Game UI Terms" />
          </Form.Item>

          <Form.Item
            name="description"
            label="Description"
          >
            <TextArea placeholder="Brief description of this glossary..." rows={3} />
          </Form.Item>

          <Form.Item
            name="source_language"
            label="Source Language"
            rules={[{ required: true, message: 'Please select source language' }]}
          >
            <LanguageSelector
              value={form.getFieldValue('source_language') || ''}
              onChange={(value) => form.setFieldValue('source_language', value)}
              languages={languages}
              placeholder="Select source language"
            />
          </Form.Item>

          <Form.Item
            name="target_language"
            label="Target Language"
            rules={[{ required: true, message: 'Please select target language' }]}
          >
            <LanguageSelector
              value={form.getFieldValue('target_language') || ''}
              onChange={(value) => form.setFieldValue('target_language', value)}
              languages={languages}
              placeholder="Select target language"
            />
          </Form.Item>

          <Form.Item
            name="is_public"
            label="Visibility"
            initialValue={false}
          >
            <Select>
              <Option value={false}>Private (Only me)</Option>
              <Option value={true}>Public (Shared)</Option>
            </Select>
          </Form.Item>

          {!editingGlossary && (
            <>
              <Divider>Import Entries (Optional)</Divider>
              
              <div style={{ marginBottom: 16 }}>
                <Space>
                  <Button 
                    type={uploadMode === 'manual' ? 'primary' : 'default'}
                    onClick={() => setUploadMode('manual')}
                  >
                    Manual Entry
                  </Button>
                  <Button 
                    type={uploadMode === 'file' ? 'primary' : 'default'}
                    onClick={() => setUploadMode('file')}
                  >
                    Upload File
                  </Button>
                </Space>
              </div>

              {uploadMode === 'file' && (
                <div style={{ marginBottom: 16 }}>
                  <Upload.Dragger
                    name="file"
                    accept=".csv,.xlsx,.xls"
                    beforeUpload={handleFileUpload}
                    showUploadList={false}
                    style={{ marginBottom: 16 }}
                  >
                    <p className="ant-upload-drag-icon">
                      <InboxOutlined />
                    </p>
                    <p className="ant-upload-text">Click or drag CSV or Excel file to this area</p>
                    <p className="ant-upload-hint">
                      Upload a CSV (.csv) or Excel (.xlsx, .xls) file with two columns: source term, target term.
                      No headers required - just data rows.
                    </p>
                  </Upload.Dragger>
                  
                  {uploadedEntries.length > 0 && (
                    <Alert
                      message={`Ready to import ${uploadedEntries.length} entries`}
                      description="These entries will be added to your glossary after creation"
                      type="success"
                      showIcon
                      style={{ marginBottom: 16 }}
                    />
                  )}
                </div>
              )}

              {uploadMode === 'manual' && (
                <Alert
                  message="Manual Entry Mode"
                  description="You can add entries manually after creating the glossary"
                  type="info"
                  showIcon
                  style={{ marginBottom: 16 }}
                />
              )}
            </>
          )}

          <Form.Item style={{ marginBottom: 0, textAlign: 'right' }}>
            <Space>
              <Button onClick={() => setModalVisible(false)}>
                Cancel
              </Button>
              <Button type="primary" htmlType="submit">
                {editingGlossary ? 'Update' : 'Create'}
              </Button>
            </Space>
          </Form.Item>
        </Form>
      </Modal>

      {/* Entries Modal */}
      <Modal
        title={`Entries: ${selectedGlossary?.name}`}
        open={entriesModalVisible}
        onCancel={() => setEntriesModalVisible(false)}
        footer={null}
        width={1000}
      >
        {/* Enhanced Search Interface */}
        <div style={{ marginBottom: 16 }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 12 }}>
            <Space>
              <Button
                icon={<UploadOutlined />}
                onClick={() => setImportModalVisible(true)}
              >
                Import Entries
              </Button>
              <Button
                type="primary"
                icon={<PlusOutlined />}
                onClick={handleAddEntry}
              >
                Add Entry
              </Button>
            </Space>
          </div>
          
          <Tabs 
            activeKey={activeSearchTab} 
            onChange={setActiveSearchTab}
            size="small"
            items={[
              {
                key: '1',
                label: (
                  <span>
                    <SearchOutlined /> Text Search
                  </span>
                ),
                children: (
                  <div style={{ padding: '12px 0' }}>
                    <div style={{ display: 'flex', gap: 8, alignItems: 'center', flexWrap: 'wrap' }}>
                      <Input
                        placeholder="Search entries by text..."
                        value={searchText}
                        onChange={(e) => setSearchText(e.target.value)}
                        onPressEnter={handleSearch}
                        style={{ flex: 1, minWidth: 200 }}
                        prefix={<SearchOutlined />}
                      />
                      <Select
                        value={searchType}
                        onChange={setSearchType}
                        style={{ width: 120 }}
                      >
                        <Option value="contains">Contains</Option>
                        <Option value="exact">Exact Match</Option>
                      </Select>
                      <Button onClick={handleSearch} type="default">
                        Search
                      </Button>
                      <Button onClick={handleClearSearch} type="default">
                        Clear
                      </Button>
                    </div>
                  </div>
                )
              },
              {
                key: '2',
                label: (
                  <span>
                    <ThunderboltOutlined /> 
                    Fuzzy Search
                  </span>
                ),
                children: (
                  <div style={{ padding: '16px 0' }}>
                    <Space direction="vertical" style={{ width: '100%' }}>
                      <div style={{ display: 'flex', gap: 12, alignItems: 'center' }}>
                        <Input
                          placeholder="Search by semantic similarity..."
                          value={embeddingSearchText}
                          onChange={(e) => setEmbeddingSearchText(e.target.value)}
                          onPressEnter={handleEmbeddingSearch}
                          style={{ 
                            flex: 1,
                            borderRadius: '8px',
                            border: '1px solid #d9d9d9',
                            boxShadow: 'none'
                          }}
                          prefix={<FireOutlined style={{ color: '#8b5cf6' }} />}
                        />
                        <Tooltip title="Maximum results to return">
                          <Select
                            value={embeddingTopK}
                            onChange={setEmbeddingTopK}
                            style={{ width: 80 }}
                          >
                            <Option value={5}>5</Option>
                            <Option value={10}>10</Option>
                            <Option value={20}>20</Option>
                            <Option value={50}>50</Option>
                          </Select>
                        </Tooltip>
                        <Button 
                          onClick={handleEmbeddingSearch} 
                          type="primary"
                          loading={embeddingLoading}
                          style={{ background: '#8b5cf6' }}
                        >
                          Search
                        </Button>
                        <Button onClick={handleClearEmbeddingSearch} type="default">
                          Clear
                        </Button>
                      </div>
                      
                      {embeddingSearchStats && (
                        <Alert
                          message={
                            <Space>
                              <Statistic 
                                title="Results" 
                                value={embeddingSearchStats.total_found} 
                                valueStyle={{ fontSize: '14px' }}
                              />
                              <Statistic 
                                title="Search Time" 
                                value={embeddingSearchStats.search_time} 
                                suffix="s"
                                valueStyle={{ fontSize: '14px' }}
                              />
                            </Space>
                          }
                          type="info"
                          showIcon
                          icon={<DatabaseOutlined />}
                          style={{ background: '#f0f0ff' }}
                        />
                      )}
                    </Space>
                  </div>
                )
              }
            ]}
          />
        </div>
        
        <Table
          columns={activeSearchTab === '2' && embeddingResults.length > 0 ? embeddingColumns : entryColumns}
          dataSource={activeSearchTab === '2' && embeddingResults.length > 0 ? embeddingResults : entries}
          rowKey="id"
          pagination={{ pageSize: 10 }}
          size="small"
          loading={entriesLoading || embeddingLoading}
          locale={{ 
            emptyText: activeSearchTab === '2' ? 'No embedding search results. Try adjusting your search terms or threshold.' : 'No entries found.'
          }}
        />
      </Modal>

      {/* Add/Edit Entry Modal */}
      <Modal
        title={editingEntry ? "Edit Entry" : "Add Entry"}
        open={entryModalVisible}
        onCancel={() => setEntryModalVisible(false)}
        footer={null}
        width={600}
      >
        <Form
          form={entryForm}
          layout="vertical"
          onFinish={handleSaveEntry}
          preserve={false}
        >
          <Form.Item
            name="source_text"
            label="Source Term"
            rules={[{ required: true, message: 'Please enter source term' }]}
          >
            <Input placeholder="Original term" />
          </Form.Item>

          <Form.Item
            name="target_text"
            label="Target Term"
            rules={[{ required: true, message: 'Please enter target term' }]}
          >
            <Input placeholder="Translated term" />
          </Form.Item>


          <Form.Item style={{ marginBottom: 0, textAlign: 'right' }}>
            <Space>
              <Button onClick={() => setEntryModalVisible(false)}>
                Cancel
              </Button>
              <Button type="primary" htmlType="submit">
                Add
              </Button>
            </Space>
          </Form.Item>
        </Form>
      </Modal>

      {/* Import Entries Modal */}
      <Modal
        title="Import Entries to Glossary"
        open={importModalVisible}
        onCancel={() => {
          setImportModalVisible(false);
          setImportEntries([]);
        }}
        footer={null}
        width={600}
      >
        <div style={{ marginBottom: 16 }}>
          <Upload.Dragger
            name="file"
            accept=".csv,.xlsx,.xls"
            beforeUpload={handleImportFileUpload}
            showUploadList={false}
          >
            <p className="ant-upload-drag-icon">
              <InboxOutlined />
            </p>
            <p className="ant-upload-text">Click or drag CSV or Excel file to this area</p>
            <p className="ant-upload-hint">
              Upload a CSV (.csv) or Excel (.xlsx, .xls) file with two columns: source term, target term.
              No headers required - just data rows. Existing entries will be updated automatically.
            </p>
          </Upload.Dragger>
        </div>
        
        {importEntries.length > 0 && (
          <>
            <Alert
              message={`Ready to import ${importEntries.length} entries`}
              description="Existing entries with the same source text will be updated. New entries will be added."
              type="info"
              showIcon
              style={{ marginBottom: 16 }}
            />
            
            <div style={{ maxHeight: 200, overflow: 'auto', marginBottom: 16 }}>
              <Table
                dataSource={importEntries.slice(0, 10).map((entry, index) => ({
                  ...entry,
                  key: `import-${index}`
                }))}
                columns={[
                  { title: 'Source Term', dataIndex: 'source_text', key: 'source' },
                  { title: 'Target Term', dataIndex: 'target_text', key: 'target' }
                ]}
                pagination={false}
                size="small"
              />
              {importEntries.length > 10 && (
                <div style={{ textAlign: 'center', padding: 8, color: '#666' }}>
                  ... and {importEntries.length - 10} more entries
                </div>
              )}
            </div>
          </>
        )}
        
        <div style={{ textAlign: 'right' }}>
          <Space>
            <Button onClick={() => {
              setImportModalVisible(false);
              setImportEntries([]);
            }}>
              Cancel
            </Button>
            <Button 
              type="primary" 
              onClick={handleImportEntries}
              disabled={importEntries.length === 0}
            >
              Import {importEntries.length} Entries
            </Button>
          </Space>
        </div>
      </Modal>
    </div>
  );
};

export default GlossaryManagement;