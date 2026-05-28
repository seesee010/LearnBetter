import { describe, it, expect, vi, beforeEach } from 'vitest';
import { useSettingsStore } from '../settingsStore';

vi.mock('../../api/tauri', () => ({
  getSettings: vi.fn().mockResolvedValue({
    theme: 'modern', color_mode: 'light', daily_goal: 30, shuffle_default: true,
  }),
  updateSettings: vi.fn().mockResolvedValue(undefined),
}));

beforeEach(() => {
  useSettingsStore.setState({
    settings: { theme: 'clean', color_mode: 'dark', daily_goal: 20, shuffle_default: false },
    loading: false,
  });
  document.documentElement.removeAttribute('data-theme');
  document.documentElement.removeAttribute('data-mode');
});

describe('settingsStore', () => {
  it('fetches and applies settings', async () => {
    await useSettingsStore.getState().fetchSettings();
    const { settings } = useSettingsStore.getState();
    expect(settings.theme).toBe('modern');
    expect(settings.color_mode).toBe('light');
    expect(document.documentElement.getAttribute('data-theme')).toBe('modern');
    expect(document.documentElement.getAttribute('data-mode')).toBe('light');
  });

  it('updateSettings applies theme to DOM immediately', async () => {
    await useSettingsStore.getState().updateSettings({ theme: 'minimal' });
    expect(document.documentElement.getAttribute('data-theme')).toBe('minimal');
    expect(useSettingsStore.getState().settings.theme).toBe('minimal');
  });
});
