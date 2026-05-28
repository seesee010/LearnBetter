import { create } from 'zustand';
import * as api from '../api/tauri';
import type { Settings } from '../types';
import { DEFAULT_SETTINGS } from '../types';

function applyTheme(settings: Settings) {
  document.documentElement.setAttribute('data-theme', settings.theme);
  document.documentElement.setAttribute('data-mode', settings.color_mode);
}

interface SettingsStore {
  settings: Settings;
  loading: boolean;
  fetchSettings: () => Promise<void>;
  updateSettings: (partial: Partial<Settings>) => Promise<void>;
}

export const useSettingsStore = create<SettingsStore>((set, get) => ({
  settings: DEFAULT_SETTINGS,
  loading: false,
  fetchSettings: async () => {
    set({ loading: true });
    try {
      const settings = await api.getSettings();
      applyTheme(settings);
      set({ settings, loading: false });
    } catch {
      applyTheme(DEFAULT_SETTINGS);
      set({ loading: false });
    }
  },
  updateSettings: async (partial) => {
    const newSettings = { ...get().settings, ...partial };
    applyTheme(newSettings);
    set({ settings: newSettings });
    await api.updateSettings(newSettings);
  },
}));
