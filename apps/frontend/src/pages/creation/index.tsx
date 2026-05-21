import { useState, useEffect } from 'react';
import { Row, Col, Input, Select, Space, Pagination, Spin, Empty, message } from 'antd';
import { SearchOutlined } from '@ant-design/icons';
import CreateVideoTaskForm from '@/components/CreateVideoTaskForm';
import VideoTaskCard from '@/components/VideoTaskCard';
import { getVideoTaskList } from '@/api/creation';
import { VideoTask, VideoTaskStatus } from '@/types/creation';
import { VideoTaskStatusText } from '@/types/creation';

const { Option } = Select;

const CreationPage: React.FC = () => {
  const [loading, setLoading] = useState(false);
  const [tasks, setTasks] = useState<VideoTask[]>([]);
  const [total, setTotal] = useState(0);
  const [page, setPage] = useState(1);
  const [pageSize, setPageSize] = useState(12);
  const [keyword, setKeyword] = useState('');
  const [status, setStatus] = useState<VideoTaskStatus | undefined>();

  const fetchTasks = async () => {
    try {
      setLoading(true);
      const res = await getVideoTaskList({
        page,
        pageSize,
        keyword,
        status,
      });
      setTasks(res.list);
      setTotal(res.total);
    } catch (error) {
      message.error('获取任务列表失败');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchTasks();
  }, [page, pageSize, keyword, status]);

  const handleSearch = () => {
    setPage(1);
    fetchTasks();
  };

  const handleCreateSuccess = () => {
    fetchTasks();
  };

  const handleDelete = () => {
    fetchTasks();
  };

  return (
    <div>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 24 }}>
        <Space size="large">
          <Input
            placeholder="搜索任务名称/剧本名称"
            prefix={<SearchOutlined />}
            style={{ width: 300 }}
            value={keyword}
            onChange={(e) => setKeyword(e.target.value)}
            onPressEnter={handleSearch}
          />
          <Select
            placeholder="任务状态"
            style={{ width: 150 }}
            value={status}
            onChange={(value) => setStatus(value)}
            allowClear
          >
            {Object.entries(VideoTaskStatusText).map(([value, label]) => (
              <Option key={value} value={value as VideoTaskStatus}>
                {label}
              </Option>
            ))}
          </Select>
        </Space>
        <CreateVideoTaskForm onSuccess={handleCreateSuccess} />
      </div>

      <Spin spinning={loading}>
        {tasks.length > 0 ? (
          <>
            <Row gutter={[16, 16]}>
              {tasks.map((task) => (
                <Col xs={24} sm={12} md={8} lg={6} key={task.id}>
                  <VideoTaskCard
                    task={task}
                    onDelete={handleDelete}
                    onRetry={fetchTasks}
                  />
                </Col>
              ))}
            </Row>
            <div style={{ display: 'flex', justifyContent: 'center', marginTop: 32 }}>
              <Pagination
                current={page}
                pageSize={pageSize}
                total={total}
                showSizeChanger
                showTotal={(total) => `共 ${total} 个任务`}
                onChange={(p, ps) => {
                  setPage(p);
                  setPageSize(ps);
                }}
              />
            </div>
          </>
        ) : (
          <Empty description="暂无视频任务，点击右上角按钮创建新任务" />
        )}
      </Spin>
    </div>
  );
};

export default CreationPage;
