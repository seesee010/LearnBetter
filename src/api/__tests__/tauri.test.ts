import { describe, it, expect, vi } from 'vitest';

const mockInvoke = vi.hoisted(() => vi.fn());
vi.mock('@tauri-apps/api/core', () => ({ invoke: mockInvoke }));
vi.mock('@tauri-apps/plugin-dialog', () => ({ open: vi.fn().mockResolvedValue('/path/file.json') }));

import { getDecks, getSettings, submitReview } from '../tauri';

describe('tauri API wrapper', () => {
  it('getDecks calls invoke with get_decks', async () => {
    mockInvoke.mockResolvedValueOnce([]);
    await getDecks();
    expect(mockInvoke).toHaveBeenCalledWith('get_decks');
  });

  it('getSettings calls invoke with get_settings', async () => {
    mockInvoke.mockResolvedValueOnce({ theme: 'clean', color_mode: 'dark', daily_goal: 20, shuffle_default: false });
    await getSettings();
    expect(mockInvoke).toHaveBeenCalledWith('get_settings');
  });

  it('submitReview calls invoke with correct args', async () => {
    mockInvoke.mockResolvedValueOnce({});
    await submitReview('card1', 4, 'session1');
    expect(mockInvoke).toHaveBeenCalledWith('submit_review', { cardId: 'card1', quality: 4, sessionId: 'session1' });
  });
});
