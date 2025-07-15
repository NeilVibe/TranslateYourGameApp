import React from 'react';
import { Card, Button, Typography, Space, Table, Tag } from 'antd';
import { UploadOutlined, FileTextOutlined, CheckCircleOutlined } from '@ant-design/icons';

const { Title, Text, Paragraph } = Typography;

interface FileUploadProps {
  onFileSelect: (file: File) => void;
  fileInfo: any;
  parseResult: any;
}

const FileUpload: React.FC<FileUploadProps> = ({
  onFileSelect,
  fileInfo,
  parseResult
}) => {
  const handleFileSelect = async () => {
    // The actual file selection is handled by the main process
    onFileSelect(null as any);
  };

  const getFormatTag = (format: string) => {
    if (!format) return <Tag color="default">UNKNOWN</Tag>;
    
    const colors: Record<string, string> = {
      excel: 'green',
      csv: 'blue',
      json: 'orange',
      xml: 'purple',
      gettext: 'magenta'
    };
    return <Tag color={colors[format] || 'default'}>{format.toUpperCase()}</Tag>;
  };

  const columns = [
    {
      title: 'Source Text',
      dataIndex: 'source',
      key: 'source',
      width: '60%',
      render: (text: string) => (
        <Text ellipsis title={text}>
          {text}
        </Text>
      )
    },
    {
      title: 'Target',
      dataIndex: 'target',
      key: 'target',
      width: '30%',
      render: (text: string) => (
        text ? (
          <Text type="success" ellipsis title={text}>
            {text}
          </Text>
        ) : (
          <Text type="secondary">—</Text>
        )
      )
    },
    {
      title: 'Info',
      dataIndex: 'metadata',
      key: 'metadata',
      width: '10%',
      render: (metadata: any) => (
        <Text type="secondary" style={{ fontSize: '12px' }}>
          {metadata?.row ? `Row ${metadata.row}` : 
           metadata?.id ? `ID: ${metadata.id}` : 
           metadata?.index ? `Index ${metadata.index}` : '—'}
        </Text>
      )
    }
  ];

  if (!fileInfo) {
    return (
      <Card 
        className="file-upload-card"
        style={{ 
          textAlign: 'center',
          marginTop: 24,
          cursor: 'pointer'
        }}
        onClick={handleFileSelect}
        hoverable
      >
        <div style={{ padding: '32px 24px' }}>
          <FileTextOutlined style={{ fontSize: 48, color: '#8b5cf6', marginBottom: 16 }} />
          
          <Title level={4} style={{ marginBottom: 8 }}>Select Game File to Translate</Title>
          
          <Text type="secondary" style={{ fontSize: 14, display: 'block', marginBottom: 20 }}>
            Upload your game localization files and get professional translations
          </Text>
          
          <div style={{ marginBottom: 24 }}>
            <Text strong style={{ fontSize: 13, color: '#a0aec0' }}>Supported Formats:</Text>
            <div style={{ marginTop: 8 }}>
              <Space size={8} wrap>
                <Tag color="green">Excel (.xlsx, .xls)</Tag>
                <Tag color="blue">CSV (.csv)</Tag>
                <Tag color="orange">JSON (.json)</Tag>
                <Tag color="purple">XML (.xml)</Tag>
                <Tag color="magenta">Gettext (.po, .pot)</Tag>
              </Space>
            </div>
          </div>
          
          <Button 
            type="primary" 
            icon={<UploadOutlined />}
            onClick={(e) => {
              e.stopPropagation();
              handleFileSelect();
            }}
            style={{ fontSize: 14 }}
          >
            Choose File
          </Button>
        </div>
      </Card>
    );
  }

  return (
    <div style={{ padding: 24 }}>
      <Card style={{ marginBottom: 24 }}>
        <Space align="start" style={{ width: '100%', justifyContent: 'space-between' }}>
          <div>
            <Title level={4} style={{ marginBottom: 8 }}>
              <CheckCircleOutlined style={{ color: '#52c41a', marginRight: 8 }} />
              File Loaded Successfully
            </Title>
            <Space direction="vertical" size={4}>
              <Text><strong>File:</strong> {fileInfo.name}</Text>
              <Text><strong>Size:</strong> {(fileInfo.size / 1024).toFixed(1)} KB</Text>
              {parseResult && (
                <>
                  <Text><strong>Format:</strong> {getFormatTag(parseResult.format || 'unknown')}</Text>
                  <Text><strong>Entries found:</strong> {parseResult.entries.length}</Text>
                  {parseResult.sourceColumn && (
                    <Text><strong>Source column:</strong> {parseResult.sourceColumn}</Text>
                  )}
                  {parseResult.targetColumn && (
                    <Text><strong>Target column:</strong> {parseResult.targetColumn}</Text>
                  )}
                </>
              )}
            </Space>
          </div>
          
          <Button onClick={handleFileSelect}>
            Choose Different File
          </Button>
        </Space>
      </Card>

      {parseResult && parseResult.entries.length > 0 && (
        <Card title="Preview Entries" extra={`${parseResult.entries.length} entries`}>
          <Table 
            dataSource={parseResult.entries.slice(0, 10)}
            columns={columns}
            pagination={false}
            size="small"
            rowKey={(record, index) => index?.toString() || '0'}
            footer={() => (
              parseResult.entries.length > 10 ? (
                <Text type="secondary">
                  Showing first 10 of {parseResult.entries.length} entries
                </Text>
              ) : null
            )}
          />
        </Card>
      )}
    </div>
  );
};

export default FileUpload;