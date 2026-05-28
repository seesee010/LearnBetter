import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';
import SettingsPage from '../settings/SettingsPage';
import { useSettingsStore } from '../../store/settingsStore';

vi.mock('../../store/settingsStore', () => ({
  useSettingsStore: vi.fn(),
}));

const mockSettings = { theme: 'clean' as const, color_mode: 'dark' as const, daily_goal: 20, shuffle_default: false };
const mockUpdate = vi.fn();

describe('SettingsPage', () => {
  beforeEach(() => {
    (useSettingsStore as unknown as ReturnType<typeof vi.fn>).mockReturnValue({
      settings: mockSettings,
      updateSettings: mockUpdate,
    });
    mockUpdate.mockClear();
  });

  it('renders theme options', () => {
    render(<SettingsPage />);
    expect(screen.getByText('Clean')).toBeInTheDocument();
    expect(screen.getByText('Modern')).toBeInTheDocument();
    expect(screen.getByText('Minimal')).toBeInTheDocument();
  });

  it('calls updateSettings when theme clicked', () => {
    render(<SettingsPage />);
    fireEvent.click(screen.getByText('Modern'));
    expect(mockUpdate).toHaveBeenCalledWith({ theme: 'modern' });
  });

  it('calls updateSettings when dark mode toggled', () => {
    render(<SettingsPage />);
    // First switch is Dark Mode, second is Shuffle
    const switches = screen.getAllByRole('switch');
    fireEvent.click(switches[0]);
    expect(mockUpdate).toHaveBeenCalledWith({ color_mode: 'light' });
  });
});
