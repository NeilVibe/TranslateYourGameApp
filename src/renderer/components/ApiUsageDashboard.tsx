import React, { useState, useEffect } from 'react';
import { Card, Row, Col, Statistic, Typography, DatePicker, Radio, Spin, Empty, message, Table, Progress } from 'antd';
import { BarChartOutlined, DollarOutlined, ApiOutlined, ClockCircleOutlined, LineChartOutlined, DatabaseOutlined } from '@ant-design/icons';
import { Line, Bar, Pie } from '@ant-design/charts';
import apiClient from '../services/apiClient';
import dayjs, { Dayjs } from 'dayjs';

const { Title, Text } = Typography;
const { RangePicker } = DatePicker;

interface UsageSummary {
  total_tokens_used: number;
  total_requests: number;
  current_balance: number;
  start_date: string;
  end_date: string;
}

interface UsageData {
  date?: string;
  time?: string;
  endpoint?: string;
  count: number;
  tokens: number;
}

interface ApiUsageResponse {
  summary: UsageSummary;
  usage_data: UsageData[];
  group_by: string;
}

const ApiUsageDashboard: React.FC = () => {
  const [loading, setLoading] = useState(false);
  const [dateRange, setDateRange] = useState<[Dayjs, Dayjs]>([
    dayjs().subtract(7, 'days'),
    dayjs()
  ]);
  const [groupBy, setGroupBy] = useState<'day' | 'hour' | 'endpoint'>('day');
  const [usageData, setUsageData] = useState<ApiUsageResponse | null>(null);

  useEffect(() => {
    fetchUsageData();
  }, [dateRange, groupBy]);

  const fetchUsageData = async () => {
    setLoading(true);
    try {
      const response = await apiClient.getApiUsage({
        startDate: dateRange[0].toISOString(),
        endDate: dateRange[1].toISOString(),
        groupBy
      });
      setUsageData(response);
    } catch (error) {
      console.error('Failed to fetch usage data:', error);
      message.error('Failed to load usage statistics');
    } finally {
      setLoading(false);
    }
  };

  const handleDateRangeChange = (dates: any) => {
    if (dates && dates[0] && dates[1]) {
      setDateRange([dates[0], dates[1]]);
    }
  };

  const getLineChartConfig = () => {
    if (!usageData || groupBy === 'endpoint') return null;

    const data = usageData.usage_data.map(item => ({
      date: item.date || item.time || '',
      tokens: item.tokens,
      requests: item.count
    }));

    return {
      data,
      xField: 'date',
      yField: 'tokens',
      seriesField: 'type',
      smooth: true,
      animation: {
        appear: {
          animation: 'path-in',
          duration: 1000,
        },
      },
      yAxis: {
        label: {
          formatter: (v: string) => `${Number(v).toLocaleString()} tokens`,
        },
      },
      xAxis: {
        label: {
          formatter: (v: string) => {
            if (groupBy === 'hour') {
              return dayjs(v).format('MMM DD HH:00');
            }
            return dayjs(v).format('MMM DD');
          },
        },
      },
      tooltip: {
        formatter: (datum: any) => {
          return {
            name: 'Tokens Used',
            value: `${datum.tokens.toLocaleString()} tokens`,
          };
        },
      },
    };
  };

  const getBarChartConfig = () => {
    if (!usageData || groupBy !== 'endpoint') return null;

    const data = usageData.usage_data
      .sort((a, b) => b.tokens - a.tokens)
      .slice(0, 10)
      .map(item => ({
        endpoint: item.endpoint || 'Unknown',
        tokens: item.tokens,
        requests: item.count
      }));

    return {
      data,
      xField: 'tokens',
      yField: 'endpoint',
      seriesField: 'endpoint',
      legend: false,
      meta: {
        tokens: {
          alias: 'Tokens Used',
        },
      },
      xAxis: {
        label: {
          formatter: (v: string) => `${Number(v).toLocaleString()}`,
        },
      },
      tooltip: {
        formatter: (datum: any) => {
          return {
            name: datum.endpoint,
            value: `${datum.tokens.toLocaleString()} tokens (${datum.requests} requests)`,
          };
        },
      },
    };
  };

  const getPieChartConfig = () => {
    if (!usageData || groupBy !== 'endpoint') return null;

    const data = usageData.usage_data
      .sort((a, b) => b.tokens - a.tokens)
      .slice(0, 5)
      .map(item => ({
        type: item.endpoint || 'Unknown',
        value: item.tokens
      }));

    const others = usageData.usage_data
      .slice(5)
      .reduce((sum, item) => sum + item.tokens, 0);

    if (others > 0) {
      data.push({ type: 'Others', value: others });
    }

    return {
      data,
      angleField: 'value',
      colorField: 'type',
      radius: 0.8,
      label: {
        type: 'outer',
        formatter: (datum: any) => `${datum.type}: ${datum.value.toLocaleString()}`,
      },
      interactions: [{ type: 'element-active' }],
    };
  };

  const getTableColumns = () => {
    if (groupBy === 'endpoint') {
      return [
        {
          title: 'Endpoint',
          dataIndex: 'endpoint',
          key: 'endpoint',
          render: (text: string) => <Text strong>{text || 'Unknown'}</Text>,
        },
        {
          title: 'Requests',
          dataIndex: 'count',
          key: 'count',
          align: 'right' as const,
          render: (count: number) => count.toLocaleString(),
        },
        {
          title: 'Tokens Used',
          dataIndex: 'tokens',
          key: 'tokens',
          align: 'right' as const,
          render: (tokens: number) => (
            <Text type="danger">{tokens.toLocaleString()}</Text>
          ),
        },
        {
          title: 'Avg Tokens/Request',
          key: 'average',
          align: 'right' as const,
          render: (_: any, record: UsageData) => 
            (record.tokens / record.count).toFixed(2),
        },
      ];
    }

    return [
      {
        title: groupBy === 'hour' ? 'Time' : 'Date',
        dataIndex: groupBy === 'hour' ? 'time' : 'date',
        key: 'date',
        render: (text: string) => {
          if (groupBy === 'hour') {
            return dayjs(text).format('MMM DD, YYYY HH:00');
          }
          return dayjs(text).format('MMM DD, YYYY');
        },
      },
      {
        title: 'Requests',
        dataIndex: 'count',
        key: 'count',
        align: 'right' as const,
        render: (count: number) => count.toLocaleString(),
      },
      {
        title: 'Tokens Used',
        dataIndex: 'tokens',
        key: 'tokens',
        align: 'right' as const,
        render: (tokens: number) => (
          <Text type="danger">{tokens.toLocaleString()}</Text>
        ),
      },
    ];
  };

  if (loading && !usageData) {
    return (
      <div style={{ textAlign: 'center', padding: '50px 0' }}>
        <Spin size="large" tip="Loading usage statistics..." />
      </div>
    );
  }

  return (
    <div style={{ padding: '24px' }}>
      <Title level={3}>
        <BarChartOutlined /> API Usage Dashboard
      </Title>

      <Row gutter={16} style={{ marginBottom: 24 }}>
        <Col span={12}>
          <RangePicker
            value={dateRange}
            onChange={handleDateRangeChange}
            style={{ width: '100%' }}
            format="YYYY-MM-DD"
          />
        </Col>
        <Col span={12}>
          <Radio.Group
            value={groupBy}
            onChange={(e) => setGroupBy(e.target.value)}
            style={{ width: '100%' }}
            buttonStyle="solid"
          >
            <Radio.Button value="day">By Day</Radio.Button>
            <Radio.Button value="hour">By Hour</Radio.Button>
            <Radio.Button value="endpoint">By Endpoint</Radio.Button>
          </Radio.Group>
        </Col>
      </Row>

      {usageData && (
        <>
          <Row gutter={16} style={{ marginBottom: 24 }}>
            <Col span={8}>
              <Card>
                <Statistic
                  title="Current Balance"
                  value={usageData.summary.current_balance}
                  precision={2}
                  prefix={<DollarOutlined />}
                  valueStyle={{ color: '#3f8600' }}
                />
              </Card>
            </Col>
            <Col span={8}>
              <Card>
                <Statistic
                  title="Tokens Used"
                  value={usageData.summary.total_tokens_used}
                  prefix={<DatabaseOutlined />}
                  valueStyle={{ color: '#cf1322' }}
                />
              </Card>
            </Col>
            <Col span={8}>
              <Card>
                <Statistic
                  title="Total Requests"
                  value={usageData.summary.total_requests}
                  prefix={<ApiOutlined />}
                />
              </Card>
            </Col>
          </Row>

          {usageData.summary.current_balance > 0 && (
            <Card style={{ marginBottom: 24 }}>
              <Title level={5}>Token Balance Usage</Title>
              <Progress
                percent={Number(((usageData.summary.total_tokens_used / (usageData.summary.current_balance + usageData.summary.total_tokens_used)) * 100).toFixed(2))}
                status="active"
                format={(percent) => `${percent}% used`}
              />
              <Text type="secondary">
                {usageData.summary.total_tokens_used.toLocaleString()} tokens used out of {(usageData.summary.current_balance + usageData.summary.total_tokens_used).toLocaleString()} total
              </Text>
            </Card>
          )}

          {groupBy !== 'endpoint' && usageData.usage_data.length > 0 && (
            <Card title={<><LineChartOutlined /> Usage Over Time</>} style={{ marginBottom: 24 }}>
              <Line {...getLineChartConfig()!} height={300} />
            </Card>
          )}

          {groupBy === 'endpoint' && usageData.usage_data.length > 0 && (
            <Row gutter={16} style={{ marginBottom: 24 }}>
              <Col span={12}>
                <Card title="Top Endpoints by Usage">
                  <Bar {...getBarChartConfig()!} height={300} />
                </Card>
              </Col>
              <Col span={12}>
                <Card title="Usage Distribution">
                  <Pie {...getPieChartConfig()!} height={300} />
                </Card>
              </Col>
            </Row>
          )}

          <Card title="Detailed Usage Data">
            {usageData.usage_data.length > 0 ? (
              <Table
                columns={getTableColumns()}
                dataSource={usageData.usage_data}
                rowKey={(record, index) => `${record.date || record.time || record.endpoint}-${index}`}
                pagination={{
                  pageSize: 10,
                  showSizeChanger: true,
                  showTotal: (total) => `Total ${total} records`,
                }}
              />
            ) : (
              <Empty description="No usage data for the selected period" />
            )}
          </Card>
        </>
      )}
    </div>
  );
};

export default ApiUsageDashboard;