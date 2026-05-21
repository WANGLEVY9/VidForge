import { useState, useEffect } from 'react';
import { Row, Col, Input, Space, Pagination, Spin, Empty, message } from 'antd';
import { SearchOutlined } from '@ant-design/icons';
import ScriptGenerateForm from '@/components/ScriptGenerateForm';
import ScriptCard from '@/components/ScriptCard';
import { getScriptList, Script } from '@/api/script';

const ScriptPage: React.FC = () => {
  const [loading, setLoading] = useState(false);
  const [scripts, setScripts] = useState<Script[]>([]);
  const [total, setTotal] = useState(0);
  const [page, setPage] = useState(1);
  const [pageSize, setPageSize] = useState(12);
  const [keyword, setKeyword] = useState('');

  const fetchScripts = async () => {
    try {
      setLoading(true);
      const res = await getScriptList({
        page,
        pageSize,
        keyword,
      });
      setScripts(res.list);
      setTotal(res.total);
    } catch (error) {
      message.error('获取剧本列表失败');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchScripts();
  }, [page, pageSize, keyword]);

  const handleSearch = () => {
    setPage(1);
    fetchScripts();
  };

  const handleGenerateSuccess = () => {
    fetchScripts();
  };

  const handleDelete = () => {
    fetchScripts();
  };

  const handleCreateVideo = (script: Script) => {
    // 后续跳转到视频创作页面
    message.info('跳转到视频生成页面，功能开发中');
  };

  return (
    <div>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 24 }}>
        <Space size="large">
          <Input
            placeholder="搜索剧本名称/商品名称"
            prefix={<SearchOutlined />}
            style={{ width: 300 }}
            value={keyword}
            onChange={(e) => setKeyword(e.target.value)}
            onPressEnter={handleSearch}
          />
        </Space>
        <ScriptGenerateForm onSuccess={handleGenerateSuccess} />
      </div>

      <Spin spinning={loading}>
        {scripts.length > 0 ? (
          <>
            <Row gutter={[16, 16]}>
              {scripts.map((script) => (
                <Col xs={24} sm={12} md={8} lg={6} key={script.id}>
                  <ScriptCard
                    script={script}
                    onDelete={handleDelete}
                    onCreateVideo={() => handleCreateVideo(script)}
                    onUpdate={fetchScripts}
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
                showTotal={(total) => `共 ${total} 个剧本`}
                onChange={(p, ps) => {
                  setPage(p);
                  setPageSize(ps);
                }}
              />
            </div>
          </>
        ) : (
          <Empty description="暂无剧本，点击右上角按钮生成新剧本" />
        )}
      </Spin>
    </div>
  );
};

export default ScriptPage;
