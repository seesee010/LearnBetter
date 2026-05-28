import { create } from 'zustand';
import * as api from '../api/tauri';
import type { Deck, DeckSummary } from '../types';
import { useToastStore } from './toastStore';

interface DeckStore {
  decks: DeckSummary[];
  currentDeck: Deck | null;
  loading: boolean;
  error: string | null;
  fetchDecks: () => Promise<void>;
  fetchDeck: (id: string) => Promise<void>;
  importFile: (path: string) => Promise<Deck | null>;
  deleteDeck: (id: string) => Promise<void>;
}

export const useDeckStore = create<DeckStore>((set) => ({
  decks: [],
  currentDeck: null,
  loading: false,
  error: null,
  fetchDecks: async () => {
    set({ loading: true, error: null });
    try {
      const decks = await api.getDecks();
      set({ decks, loading: false });
    } catch (e) {
      const msg = e instanceof Error ? e.message : String(e);
      set({ error: msg, loading: false });
      useToastStore.getState().addToast(`Failed to load decks: ${msg}`, 'error');
    }
  },
  fetchDeck: async (id) => {
    set({ loading: true, error: null });
    try {
      const deck = await api.getDeck(id);
      set({ currentDeck: deck ?? null, loading: false });
    } catch (e) {
      const msg = e instanceof Error ? e.message : String(e);
      set({ error: msg, loading: false });
      useToastStore.getState().addToast(`Failed to load deck: ${msg}`, 'error');
    }
  },
  importFile: async (path) => {
    set({ loading: true, error: null });
    try {
      const deck = await api.importFile(path);
      const decks = await api.getDecks();
      set({ decks, loading: false });
      useToastStore.getState().addToast(`Imported ${deck.cards.length} cards!`, 'success');
      return deck;
    } catch (e) {
      const msg = e instanceof Error ? e.message : String(e);
      set({ error: msg, loading: false });
      useToastStore.getState().addToast(`Import failed: ${msg}`, 'error');
      return null;
    }
  },
  deleteDeck: async (id) => {
    try {
      await api.deleteDeck(id);
      const decks = await api.getDecks();
      set({ decks });
      useToastStore.getState().addToast('Deck deleted', 'info');
    } catch (e) {
      const msg = e instanceof Error ? e.message : String(e);
      useToastStore.getState().addToast(`Delete failed: ${msg}`, 'error');
    }
  },
}));
