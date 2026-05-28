import type { Toast as ToastType } from '../../store/toastStore';

interface Props {
  toasts: ToastType[];
  onRemove: (id: string) => void;
}

const colorMap = { success: '#22c55e', error: '#ef4444', info: 'var(--accent)' };

export default function Toast({ toasts, onRemove }: Props) {
  if (toasts.length === 0) return null;
  return (
    <div style={{ position: 'fixed', top: 16, right: 16, zIndex: 9999, display: 'flex', flexDirection: 'column', gap: 8 }}>
      {toasts.map((t) => (
        <div
          key={t.id}
          role="alert"
          onClick={() => onRemove(t.id)}
          style={{
            background: 'var(--bg-secondary)',
            border: `2px solid ${colorMap[t.type]}`,
            color: 'var(--text-primary)',
            padding: '10px 16px',
            borderRadius: 'var(--border-radius-md, 8px)',
            cursor: 'pointer',
            maxWidth: 320,
            boxShadow: '0 4px 12px rgba(0,0,0,0.3)',
            fontSize: 14,
          }}
        >
          {t.message}
        </div>
      ))}
    </div>
  );
}
