import { useSettingsStore } from '../../store/settingsStore';
import type { Settings } from '../../types';

function ThemePreview({ theme, active, onClick }: { theme: Settings['theme']; active: boolean; onClick: () => void }) {
  const styles: Record<string, { bg: string; accent: string; radius: string; font: string }> = {
    clean:   { bg: '#1a1a1a', accent: '#6366f1', radius: '4px',  font: 'sans-serif' },
    modern:  { bg: '#1e1b2e', accent: '#7c6ff7', radius: '12px', font: 'sans-serif' },
    minimal: { bg: '#111111', accent: '#a3a3a3', radius: '2px',  font: 'monospace' },
  };
  const s = styles[theme];
  return (
    <button
      onClick={onClick}
      style={{
        background: s.bg, border: `2px solid ${active ? s.accent : '#333'}`,
        borderRadius: 8, padding: 12, cursor: 'pointer', textAlign: 'left',
        width: '100%', transition: 'border-color 0.15s',
      }}
    >
      <div style={{ display: 'flex', gap: 6, marginBottom: 6 }}>
        {[s.accent, '#444', '#444'].map((c, i) => (
          <div key={i} style={{ height: 8, flex: i === 0 ? 1 : 2, background: c, borderRadius: s.radius }} />
        ))}
      </div>
      <div style={{ height: 4, background: '#333', borderRadius: s.radius, marginBottom: 4 }} />
      <div style={{ height: 4, background: '#333', borderRadius: s.radius, width: '70%' }} />
      <div style={{ marginTop: 8, color: s.accent, fontSize: 11, fontFamily: s.font, fontWeight: 600 }}>
        {theme.charAt(0).toUpperCase() + theme.slice(1)}
      </div>
    </button>
  );
}

function Toggle({ checked, onChange }: { checked: boolean; onChange: (v: boolean) => void }) {
  return (
    <button
      role="switch"
      aria-checked={checked}
      onClick={() => onChange(!checked)}
      style={{
        width: 44, height: 24, borderRadius: 12, position: 'relative',
        background: checked ? 'var(--accent)' : 'var(--border)',
        transition: 'background 0.2s', flexShrink: 0,
      }}
    >
      <span style={{
        position: 'absolute', top: 3, left: checked ? 23 : 3,
        width: 18, height: 18, borderRadius: '50%',
        background: '#fff', transition: 'left 0.2s',
      }} />
    </button>
  );
}

function Section({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <section className="settings-section card" style={{ marginBottom: 'var(--spacing-md)' }}>
      <h2 style={{ fontSize: 'var(--font-size-lg)', fontWeight: 600, marginBottom: 'var(--spacing-lg)', color: 'var(--accent)' }}>{title}</h2>
      {children}
    </section>
  );
}

function SettingRow({ label, description, children }: { label: string; description?: string; children: React.ReactNode }) {
  return (
    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', gap: 'var(--spacing-md)', marginBottom: 'var(--spacing-md)' }}>
      <div>
        <div style={{ fontWeight: 500 }}>{label}</div>
        {description && <div style={{ fontSize: 'var(--font-size-sm)', color: 'var(--text-secondary)', marginTop: 2 }}>{description}</div>}
      </div>
      {children}
    </div>
  );
}

export default function SettingsPage() {
  const { settings, updateSettings } = useSettingsStore();

  return (
    <div className="page">
      <h1 style={{ fontSize: 'var(--font-size-xl)', fontWeight: 700, marginBottom: 'var(--spacing-lg)' }}>Settings</h1>

      <Section title="Appearance">
        <div style={{ marginBottom: 'var(--spacing-md)' }}>
          <div style={{ fontWeight: 500, marginBottom: 'var(--spacing-sm)' }}>Theme</div>
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: 'var(--spacing-sm)' }}>
            {(['clean', 'modern', 'minimal'] as const).map((t) => (
              <ThemePreview key={t} theme={t} active={settings.theme === t} onClick={() => updateSettings({ theme: t })} />
            ))}
          </div>
        </div>
        <SettingRow label="Dark Mode" description="Toggle between dark and light appearance">
          <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
            <span style={{ fontSize: 16 }}>{settings.color_mode === 'dark' ? '🌙' : '☀️'}</span>
            <Toggle checked={settings.color_mode === 'dark'} onChange={(v) => updateSettings({ color_mode: v ? 'dark' : 'light' })} />
          </div>
        </SettingRow>
      </Section>

      <Section title="Study">
        <SettingRow label="Daily Goal" description="Target number of cards to review per day">
          <input
            type="number" min={1} max={500} value={settings.daily_goal}
            onChange={(e) => updateSettings({ daily_goal: Number(e.target.value) })}
            style={{
              width: 80, padding: '6px 10px', background: 'var(--bg-tertiary)',
              border: '1px solid var(--border)', borderRadius: 'var(--border-radius-sm)',
              color: 'var(--text-primary)', textAlign: 'center',
            }}
          />
        </SettingRow>
        <SettingRow label="Shuffle by Default" description="Randomize card order when starting a session">
          <Toggle checked={settings.shuffle_default} onChange={(v) => updateSettings({ shuffle_default: v })} />
        </SettingRow>
      </Section>

      <style>{`.settings-section { padding: var(--spacing-lg); }`}</style>
    </div>
  );
}
