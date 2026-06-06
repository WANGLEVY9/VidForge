import { useCallback, useState } from 'react';
import { useKeyboardShortcuts } from '@/hooks/useKeyboardShortcuts';
import { Modal } from 'antd';
import { KeyboardOutlined } from '@ant-design/icons';

const SHORTCUTS = [
  { keys: 'Ctrl+S', label: '保存当前页面' },
  { keys: 'Ctrl+K', label: '打开命令面板' },
  { keys: '?', label: '显示快捷键帮助' },
  { keys: 'Space', label: '播放/暂停视频（创作页）' },
  { keys: '← →', label: '切换分镜（创作页）' },
  { keys: 'Ctrl+D', label: '复制分镜（创作页）' },
  { keys: 'Delete', label: '删除分镜（创作页）' },
];

export function GlobalShortcuts() {
  const [helpOpen, setHelpOpen] = useState(false);

  const handleSave = useCallback(() => {
    window.dispatchEvent(new CustomEvent('app:save'));
  }, []);

  const handleCommandPalette = useCallback(() => {
    window.dispatchEvent(new CustomEvent('app:command-palette'));
    // Fallback: focus the first input[type="search"] or [contenteditable]
    const searchInput = document.querySelector<HTMLInputElement>('input[type="search"]');
    if (searchInput) { searchInput.focus(); return; }
    const anyInput = document.querySelector<HTMLInputElement>('input:not([type="hidden"])');
    if (anyInput) { anyInput.focus(); }
  }, []);

  useKeyboardShortcuts({
    'Ctrl+S': handleSave,
    'Ctrl+K': handleCommandPalette,
    'Shift+?': () => setHelpOpen(true),
    '?': () => setHelpOpen(true),
  });

  return (
    <Modal
      title={<><KeyboardOutlined /> 快捷键</>}
      open={helpOpen}
      onCancel={() => setHelpOpen(false)}
      footer={null}
      width={400}
    >
      <div style={{ display: 'flex', flexDirection: 'column', gap: 12, marginTop: 16 }}>
        {SHORTCUTS.map((s) => (
          <div key={s.keys} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
            <span style={{ color: 'var(--text-secondary)' }}>{s.label}</span>
            <kbd style={{
              padding: '2px 8px',
              borderRadius: 4,
              border: '1px solid var(--border-color)',
              background: 'var(--bg-secondary)',
              fontFamily: 'monospace',
              fontSize: 13,
            }}>{s.keys}</kbd>
          </div>
        ))}
      </div>
    </Modal>
  );
}
