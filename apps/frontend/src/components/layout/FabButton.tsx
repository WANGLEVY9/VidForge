import { useState, useRef, useEffect } from 'react';
import { PlusOutlined, ThunderboltOutlined, CloudUploadOutlined } from '@ant-design/icons';
import { useLocation, useNavigate } from 'react-router-dom';

interface FabAction {
  key: string;
  label: string;
  icon: React.ReactNode;
  onClick: () => void;
}

interface FabButtonProps {
  actions?: FabAction[];
  hidden?: boolean;
}

export function FabButton({ actions, hidden = false }: FabButtonProps) {
  const [open, setOpen] = useState(false);
  const fabRef = useRef<HTMLDivElement>(null);
  const location = useLocation();
  const navigate = useNavigate();
  const resolvedActions = actions ?? [
    {
      key: 'quick-create',
      label: '快速创作',
      icon: <ThunderboltOutlined />,
      onClick: () => navigate('/try'),
    },
    {
      key: 'upload',
      label: '上传素材',
      icon: <CloudUploadOutlined />,
      onClick: () => navigate('/workspace'),
    },
  ];

  useEffect(() => {
    if (!open) return;
    const handleClickOutside = (e: MouseEvent) => {
      if (fabRef.current && !fabRef.current.contains(e.target as Node)) {
        setOpen(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, [open]);

  useEffect(() => {
    setOpen(false);
  }, [location.pathname]);

  if (hidden) return null;

  return (
    <div
      ref={fabRef}
      style={{ position: 'fixed', bottom: 'var(--fab-bottom)', right: 16, zIndex: 101 }}
    >
      {open && (
        <div
          style={{
            position: 'absolute',
            bottom: 64,
            right: 0,
            display: 'flex',
            flexDirection: 'column',
            gap: 8,
            alignItems: 'flex-end',
          }}
        >
          {resolvedActions.map((action, i) => (
            <div
              key={action.key}
              className="fab-enter"
              style={{
                animationDelay: `${i * 0.05}s`,
                display: 'flex',
                alignItems: 'center',
                gap: 8,
                cursor: 'pointer',
              }}
              onClick={() => {
                action.onClick();
                setOpen(false);
              }}
              role="button"
              tabIndex={0}
              aria-label={action.label}
              onKeyDown={(event) => {
                if (event.key === 'Enter' || event.key === ' ') {
                  event.preventDefault();
                  action.onClick();
                  setOpen(false);
                }
              }}
            >
              <span
                style={{
                  padding: '4px 8px',
                  borderRadius: 'var(--radius-sm)',
                  background: 'var(--bg-elevated)',
                  color: 'var(--text-primary)',
                  border: '1px solid var(--border-color)',
                  fontSize: 12,
                  whiteSpace: 'nowrap',
                }}
              >
                {action.label}
              </span>
              <div
                style={{
                  width: 44,
                  height: 44,
                  borderRadius: '50%',
                  background:
                    'linear-gradient(135deg, var(--brand-primary), var(--brand-secondary))',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  color: '#fff',
                  fontSize: 18,
                  boxShadow: '0 4px 16px rgba(99,102,241,0.4)',
                }}
              >
                {action.icon}
              </div>
            </div>
          ))}
        </div>
      )}

      <div
        onClick={() => setOpen(!open)}
        role="button"
        tabIndex={0}
        aria-label={open ? '关闭快速操作菜单' : '打开快速操作菜单'}
        aria-expanded={open}
        onKeyDown={(event) => {
          if (event.key === 'Enter' || event.key === ' ') {
            event.preventDefault();
            setOpen((current) => !current);
          }
        }}
        style={{
          width: 'var(--fab-size)',
          height: 'var(--fab-size)',
          borderRadius: '50%',
          background: 'linear-gradient(135deg, var(--brand-primary), var(--brand-secondary))',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          color: '#fff',
          fontSize: 24,
          cursor: 'pointer',
          boxShadow: '0 6px 20px rgba(99,102,241,0.5)',
          transition: 'transform 0.2s, box-shadow 0.2s',
          transform: open ? 'rotate(45deg)' : 'rotate(0deg)',
        }}
      >
        <PlusOutlined />
      </div>
    </div>
  );
}
