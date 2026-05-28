import { create } from 'zustand';
import * as api from '../api/tauri';
import type { Stats } from '../types';
import { useToastStore } from './toastStore';

interface StatsStore {
  stats: Stats | null;
  loading: boolean;
  fetchStats: () => Promise<void>;
}

export const useStatsStore = create<StatsStore>((set) => ({
  stats: null,
  loading: false,
  fetchStats: async () => {
    set({ loading: true });
    try {
      const stats = await api.getStats();
      set({ stats, loading: false });
    } catch (e) {
      const msg = e instanceof Error ? e.message : String(e);
      set({ loading: false });
      useToastStore.getState().addToast(`Failed to load stats: ${msg}`, 'error');
    }
  },
}));
