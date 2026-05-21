import { useState, useEffect } from 'react';
import { Timeline, Card, Descriptions, Tag, Space, Button, Input, InputNumber, message, Modal, Form, Select, Slider, Row, Col, Divider } from 'antd';
import { VideoCameraOutlined, SoundOutlined, FontColorsOutlined, BgColorsOutlined, UpOutlined, DownOutlined, EditOutlined, ReloadOutlined, PlusOutlined, DeleteOutlined, PlayCircleOutlined, MusicOutlined } from '@ant-design/icons';
import { Storyboard } from '@/types/script';
import { formatDuration } from '@/utils';
import { updateScriptStoryboards, regenerateStoryboard } from '@/api/script';
import { generateTTS, getVoiceList, VoiceOption, TTSVoiceType } from '@/api/ai';

const { TextArea } = Input;

interface EditableStoryboardListProps {
  scriptId: string;
  storyboards: Storyboard[];
  totalDuration?: number;
  onSave?: (storyboards: Storyboard[]) => void;
}

const EditableStoryboardList: React.FC<EditableStoryboardListProps> = ({ scriptId, storyboards: initialStoryboards, totalDuration, onSave }) => {
  const [storyboards, setStoryboards] = useState<Storyboard[]>([...initialStoryboards]);
  const [editingIndex, setEditingIndex] = useState<number | null>(null);
  const [regenerateModalVisible, setRegenerateModalVisible] = useState(false);
  const [regenerateIndex, setRegenerateIndex] = useState<number | null>(null);
  const [regeneratePrompt, setRegeneratePrompt] = useState('');
  const [loading, setLoading] = useState(false);
  const [form] = Form.useForm();
  const [voiceOptions, setVoiceOptions] = useState<VoiceOption[]>([]);
  const [selectedVoice, setSelectedVoice] = useState<TTSVoiceType>(TTSVoiceType.ZH_FEMALE_WARM);
  const [ttsLoading, setTtsLoading] = useState(false);
  const [currentAudioUrl, setCurrentAudioUrl] = useState<string | null>(null);
  const [globalVoiceConfig, setGlobalVoiceConfig] = useState({
    speed: 1.0,
    pitch: 1.0,
    volume: 50,
  });

  // 加载音色列表
  useEffect(() => {
    const loadVoices = async () => {
      try {
        const voices = await getVoiceList();
        setVoiceOptions(voices);
      } catch (error) {
        console.error('加载音色列表失败:', error);
      }
    };
    loadVoices();
  }, []);

  // 上移分镜
  const moveUp = (index: number) => {
    if (index === 0) return;
    const newStoryboards = [...storyboards];
    [newStoryboards[index - 1], newStoryboards[index]] = [newStoryboards[index], newStoryboards[index - 1]];
    // 重新排序号
    newStoryboards.forEach((sb, i) => sb.index = i + 1);
    setStoryboards(newStoryboards);
  };

  // 下移分镜
  const moveDown = (index: number) => {
    if (index === storyboards.length - 1) return;
    const newStoryboards = [...storyboards];
    [newStoryboards[index + 1], newStoryboards[index]] = [newStoryboards[index], newStoryboards[index + 1]];
    newStoryboards.forEach((sb, i) => sb.index = i + 1);
    setStoryboards(newStoryboards);
  };

  // 新增分镜
  const addStoryboard = () => {
    const newStoryboard: any = {
      index: storyboards.length + 1,
      sceneDescription: '请输入画面描述',
      cameraMovement: '固定',
      dialogue: '',
      duration: 3,
      bgm: '动感轻快',
      subtitle: '',
    };
    setStoryboards([...storyboards, newStoryboard]);
  };

  // 删除分镜
  const deleteStoryboard = (index: number) => {
    if (storyboards.length <= 1) {
      message.error('至少保留一个分镜');
      return;
    }
    const newStoryboards = storyboards.filter((_, i) => i !== index);
    newStoryboards.forEach((sb, i) => sb.index = i + 1);
    setStoryboards(newStoryboards);
  };

  // 开始编辑
  const startEdit = (index: number) => {
    setEditingIndex(index);
    const sb = storyboards[index];
    form.setFieldsValue({
      sceneDescription: sb.sceneDescription,
      cameraMovement: sb.cameraMovement,
      dialogue: sb.dialogue,
      duration: sb.duration,
      bgm: sb.bgm,
      subtitle: sb.subtitle,
    });
  };

  // 保存编辑
  const saveEdit = () => {
    form.validateFields().then(values => {
      const newStoryboards = [...storyboards];
      newStoryboards[editingIndex!] = {
        ...newStoryboards[editingIndex!],
        ...values,
      };
      setStoryboards(newStoryboards);
      setEditingIndex(null);
      form.resetFields();
    });
  };

  // 取消编辑
  const cancelEdit = () => {
    setEditingIndex(null);
    form.resetFields();
    setCurrentAudioUrl(null);
  };

  // 生成TTS语音
  const handleGenerateTTS = async (text: string) => {
    if (!text) {
      message.warning('请先输入台词内容');
      return;
    }
    try {
      setTtsLoading(true);
      const result = await generateTTS({
        text,
        voiceType: selectedVoice,
        speed: globalVoiceConfig.speed,
        pitch: globalVoiceConfig.pitch,
        volume: globalVoiceConfig.volume,
      });
      setCurrentAudioUrl(result.audioUrl);
      message.success('语音生成成功');
    } catch (error) {
      message.error('语音生成失败');
    } finally {
      setTtsLoading(false);
    }
  };

  // 打开重生成模态框
  const openRegenerateModal = (index: number) => {
    setRegenerateIndex(index);
    setRegeneratePrompt('');
    setRegenerateModalVisible(true);
  };

  // 重新生成分镜
  const handleRegenerate = async () => {
    if (regenerateIndex === null) return;
    try {
      setLoading(true);
      const result = await regenerateStoryboard(scriptId, regenerateIndex + 1, regeneratePrompt);
      setStoryboards(result.storyboards);
      message.success('重生成成功');
      setRegenerateModalVisible(false);
    } catch (error) {
      message.error('重生成失败');
    } finally {
      setLoading(false);
    }
  };

  // 保存所有修改
  const handleSaveAll = async () => {
    try {
      setLoading(true);
      const result = await updateScriptStoryboards(scriptId, storyboards);
      message.success('保存成功');
      onSave?.(result.storyboards);
    } catch (error) {
      message.error('保存失败');
    } finally {
      setLoading(false);
    }
  };

  const getTotalDuration = () => {
    return storyboards.reduce((sum, sb) => sum + sb.duration, 0);
  };

  return (
    <div>
      <div style={{ marginBottom: 16, display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
        <Space>
          <h3>分镜列表</h3>
          <Tag color="blue">总时长：{formatDuration(getTotalDuration())}</Tag>
        </Space>
        <Space>
          <Button type="primary" icon={<PlusOutlined />} onClick={addStoryboard}>
            新增分镜
          </Button>
          <Button type="primary" loading={loading} onClick={handleSaveAll}>
            保存所有修改
          </Button>
        </Space>
      </div>
      
      <Timeline
        items={storyboards.map((sb, index) => ({
          dot: <div style={{ background: '#1890ff', width: 24, height: 24, borderRadius: '50%', display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#fff' }}>{sb.index}</div>,
          children: (
            <Card size="small" style={{ marginBottom: 16 }}>
              {editingIndex === index ? (
                <Form form={form} layout="vertical">
                  <Form.Item
                    label="画面描述"
                    name="sceneDescription"
                    rules={[{ required: true, message: '请输入画面描述' }]}
                  >
                    <TextArea rows={3} />
                  </Form.Item>
                  <Form.Item label="镜头运动" name="cameraMovement">
                    <Input />
                  </Form.Item>
                  <Form.Item label="台词/旁白" name="dialogue">
                    <TextArea rows={2} />
                  </Form.Item>
                  <Form.Item label="时长（秒）" name="duration" rules={[{ required: true, message: '请输入时长' }]}>
                    <InputNumber min={1} max={30} style={{ width: '100%' }} />
                  </Form.Item>
                  <Form.Item label="BGM风格" name="bgm">
                    <Select
                      placeholder="选择BGM风格"
                      allowCustomValue
                      options={[
                        { value: '动感轻快', label: '动感轻快' },
                        { value: '温馨治愈', label: '温馨治愈' },
                        { value: '科技感', label: '科技感' },
                        { value: '奢华高端', label: '奢华高端' },
                        { value: '轻松幽默', label: '轻松幽默' },
                        { value: '激情活力', label: '激情活力' },
                        { value: '优雅知性', label: '优雅知性' },
                        { value: '震撼大气', label: '震撼大气' },
                      ]}
                    />
                  </Form.Item>
                  <Form.Item label="字幕内容" name="subtitle">
                    <Input />
                  </Form.Item>
                  
                  <Divider orientation="left">语音设置</Divider>
                  
                  <Row gutter={16}>
                    <Col span={12}>
                      <Form.Item label="选择音色">
                        <Select
                          value={selectedVoice}
                          onChange={(value) => setSelectedVoice(value)}
                          options={voiceOptions.map(v => ({ value: v.value, label: v.label }))}
                        />
                      </Form.Item>
                    </Col>
                    <Col span={12}>
                      <Form.Item label="语速">
                        <Slider
                          min={0.5}
                          max={2.0}
                          step={0.1}
                          value={globalVoiceConfig.speed}
                          onChange={(value) => setGlobalVoiceConfig({ ...globalVoiceConfig, speed: value })}
                          tooltip={{ formatter: (val) => `${val}x` }}
                        />
                      </Form.Item>
                    </Col>
                    <Col span={12}>
                      <Form.Item label="音调">
                        <Slider
                          min={0.5}
                          max={2.0}
                          step={0.1}
                          value={globalVoiceConfig.pitch}
                          onChange={(value) => setGlobalVoiceConfig({ ...globalVoiceConfig, pitch: value })}
                          tooltip={{ formatter: (val) => `${val}x` }}
                        />
                      </Form.Item>
                    </Col>
                    <Col span={12}>
                      <Form.Item label="音量">
                        <Slider
                          min={0}
                          max={100}
                          value={globalVoiceConfig.volume}
                          onChange={(value) => setGlobalVoiceConfig({ ...globalVoiceConfig, volume: value })}
                          tooltip={{ formatter: (val) => `${val}%` }}
                        />
                      </Form.Item>
                    </Col>
                  </Row>

                  <Space style={{ marginBottom: 16 }}>
                    <Button 
                      type="dashed" 
                      icon={<SoundOutlined />} 
                      loading={ttsLoading}
                      onClick={() => handleGenerateTTS(form.getFieldValue('dialogue'))}
                    >
                      生成语音
                    </Button>
                    {currentAudioUrl && (
                      <audio src={currentAudioUrl} controls style={{ height: 32 }} />
                    )}
                  </Space>

                  <Space>
                    <Button type="primary" onClick={saveEdit}>保存</Button>
                    <Button onClick={cancelEdit}>取消</Button>
                  </Space>
                </Form>
              ) : (
                <>
                  <Descriptions column={2} size="small">
                    <Descriptions.Item label="画面描述" span={2}>
                      {sb.sceneDescription}
                    </Descriptions.Item>
                    <Descriptions.Item label="镜头运动">
                      <Space>
                        <VideoCameraOutlined />
                        {sb.cameraMovement || '固定'}
                      </Space>
                    </Descriptions.Item>
                    <Descriptions.Item label="时长">
                      {sb.duration}s
                    </Descriptions.Item>
                    <Descriptions.Item label="台词/旁白" span={2}>
                      <Space>
                        <SoundOutlined />
                        {sb.dialogue || '无'}
                      </Space>
                    </Descriptions.Item>
                    <Descriptions.Item label="字幕" span={2}>
                      <Space>
                        <FontColorsOutlined />
                        {sb.subtitle || '无'}
                      </Space>
                    </Descriptions.Item>
                    <Descriptions.Item label="BGM风格" span={2}>
                      <Space>
                        <BgColorsOutlined />
                        {sb.bgm || '无'}
                      </Space>
                    </Descriptions.Item>
                  </Descriptions>
                  <div style={{ marginTop: 12, display: 'flex', gap: 8, justifyContent: 'flex-end' }}>
                    <Button size="small" icon={<UpOutlined />} onClick={() => moveUp(index)} disabled={index === 0} />
                    <Button size="small" icon={<DownOutlined />} onClick={() => moveDown(index)} disabled={index === storyboards.length - 1} />
                    <Button size="small" icon={<EditOutlined />} onClick={() => startEdit(index)}>编辑</Button>
                    <Button size="small" icon={<ReloadOutlined />} onClick={() => openRegenerateModal(index)}>重生成</Button>
                    <Button size="small" danger icon={<DeleteOutlined />} onClick={() => deleteStoryboard(index)}>删除</Button>
                  </div>
                </>
              )}
            </Card>
          ),
        }))}
      />

      <Modal
        title="重新生成分镜"
        open={regenerateModalVisible}
        onOk={handleRegenerate}
        onCancel={() => setRegenerateModalVisible(false)}
        confirmLoading={loading}
        width={600}
      >
        <Form layout="vertical">
          <Form.Item label="生成Prompt（可选，描述你想要的分镜效果）">
            <TextArea
              rows={4}
              placeholder="例如：画面要突出产品的质感，台词要更有感染力"
              value={regeneratePrompt}
              onChange={(e) => setRegeneratePrompt(e.target.value)}
            />
          </Form.Item>
        </Form>
      </Modal>
    </div>
  );
};

export default EditableStoryboardList;
