import React, { useState, useEffect } from 'react';
import { Table, Button, Modal, Form, Input, Space, Typography, message, Popconfirm } from 'antd';
import { PlusOutlined, EditOutlined, DeleteOutlined, SearchOutlined } from '@ant-design/icons';

const { Title } = Typography;
const { Search } = Input;

interface GlossaryEntry {
  id: number;
  source_text: string;
  target_text: string;
  created_at: string;
}

interface Glossary {
  id: number;
  name: string;
  description: string;
  entry_count: number;
  created_at: string;
}

interface ReactGlossaryManagerProps {
  apiKey: string;
  apiBaseUrl: string;
}

const ReactGlossaryManager: React.FC<ReactGlossaryManagerProps> = ({ apiKey, apiBaseUrl }) => {
  const [glossaries, setGlossaries] = useState<Glossary[]>([]);
  const [selectedGlossary, setSelectedGlossary] = useState<Glossary | null>(null);
  const [entries, setEntries] = useState<GlossaryEntry[]>([]);
  const [loading, setLoading] = useState(false);
  const [isModalVisible, setIsModalVisible] = useState(false);
  const [editingEntry, setEditingEntry] = useState<GlossaryEntry | null>(null);
  const [form] = Form.useForm();
  const [searchText, setSearchText] = useState('');

  // Load glossaries on component mount
  useEffect(() => {
    loadGlossaries();
  }, []);

  // Load entries when glossary changes
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
      const response = await fetch(`${apiBaseUrl}/glossaries/${glossaryId}/entries`, {
        headers: { 'X-API-Key': apiKey }
      });
      
      if (!response.ok) throw new Error('Failed to load entries');
      
      const data = await response.json();
      if (data.status === 'success' && data.data) {
        setEntries(data.data.entries || []);
      }
    } catch (error) {
      console.error('Error loading entries:', error);
      message.error('Failed to load glossary entries');
    } finally {
      setLoading(false);
    }
  };

  const handleAddEntry = () => {
    setEditingEntry(null);
    form.resetFields();
    setIsModalVisible(true);
  };

  const handleEditEntry = (entry: GlossaryEntry) => {
    setEditingEntry(entry);
    form.setFieldsValue({
      source_text: entry.source_text,
      target_text: entry.target_text
    });
    setIsModalVisible(true);
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
      loadGlossaryEntries(selectedGlossary!.id);
    } catch (error) {
      console.error('Error saving entry:', error);
      message.error('Failed to save entry');
    }
  };

  // Filter entries based on search
  const filteredEntries = entries.filter(entry => 
    entry.source_text.toLowerCase().includes(searchText.toLowerCase()) ||
    entry.target_text.toLowerCase().includes(searchText.toLowerCase())
  );

  const columns = [
    {
      title: 'Source Text',
      dataIndex: 'source_text',
      key: 'source_text',
      width: '40%',
      sorter: (a: GlossaryEntry, b: GlossaryEntry) => a.source_text.localeCompare(b.source_text),
    },
    {
      title: 'Target Text',
      dataIndex: 'target_text',
      key: 'target_text',
      width: '40%',
      sorter: (a: GlossaryEntry, b: GlossaryEntry) => a.target_text.localeCompare(b.target_text),
    },
    {
      title: 'Actions',
      key: 'actions',
      width: '20%',
      render: (_: any, record: GlossaryEntry) => (
        <Space>
          <Button 
            type="text" 
            icon={<EditOutlined />} 
            onClick={() => handleEditEntry(record)}
          />
          <Popconfirm
            title="Are you sure you want to delete this entry?"
            onConfirm={() => handleDeleteEntry(record.id)}
          >
            <Button type="text" danger icon={<DeleteOutlined />} />
          </Popconfirm>
        </Space>
      ),
    },
  ];

  return (
    <div style={{ padding: '24px', background: '#1a1a1a', minHeight: '100vh' }}>
      <Title level={2} style={{ color: '#e2e8f0', marginBottom: '24px' }}>
        Glossary Management
      </Title>
      
      {/* Glossary Selection */}
      <div style={{ marginBottom: '24px' }}>
        <Title level={4} style={{ color: '#a0aec0' }}>Select Glossary:</Title>
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
      </div>

      {selectedGlossary && (
        <>
          {/* Controls */}
          <div style={{ 
            display: 'flex', 
            justifyContent: 'space-between', 
            alignItems: 'center',
            marginBottom: '16px',
            background: '#2d3748',
            padding: '16px',
            borderRadius: '8px'
          }}>
            <Title level={3} style={{ color: '#e2e8f0', margin: 0 }}>
              {selectedGlossary.name}
            </Title>
            <Space>
              <Search
                placeholder="Search entries..."
                value={searchText}
                onChange={(e) => setSearchText(e.target.value)}
                style={{ width: 250 }}
                allowClear
              />
              <Button 
                type="primary" 
                icon={<PlusOutlined />}
                onClick={handleAddEntry}
              >
                Add Entry
              </Button>
            </Space>
          </div>

          {/* Entries Table */}
          <Table
            columns={columns}
            dataSource={filteredEntries}
            rowKey="id"
            loading={loading}
            pagination={{
              pageSize: 20,
              showSizeChanger: true,
              showQuickJumper: true,
              showTotal: (total, range) => 
                `${range[0]}-${range[1]} of ${total} entries`,
            }}
            style={{
              background: '#2d3748',
              borderRadius: '8px'
            }}
            className="dark-table"
          />
        </>
      )}

      {/* Add/Edit Modal */}
      <Modal
        title={editingEntry ? 'Edit Entry' : 'Add New Entry'}
        open={isModalVisible}
        onCancel={() => setIsModalVisible(false)}
        footer={null}
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
            <Input.TextArea rows={3} placeholder="Enter source text..." />
          </Form.Item>
          
          <Form.Item
            name="target_text"
            label="Target Text"
            rules={[{ required: true, message: 'Please enter target text' }]}
          >
            <Input.TextArea rows={3} placeholder="Enter target text..." />
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
    </div>
  );
};

export default ReactGlossaryManager;