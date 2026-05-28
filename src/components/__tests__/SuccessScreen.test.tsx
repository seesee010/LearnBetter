import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';
import { MemoryRouter, Route, Routes } from 'react-router-dom';
import SuccessScreen from '../success/SuccessScreen';
import { useStudyStore } from '../../store/studyStore';

vi.mock('../../store/studyStore', () => ({
  useStudyStore: vi.fn(),
}));

const mockStats = { accuracy: 0.75, duration: 90000, cardsTotal: 8, cardsCorrect: 6 };

describe('SuccessScreen', () => {
  beforeEach(() => {
    (useStudyStore as unknown as ReturnType<typeof vi.fn>).mockReturnValue({
      sessionStats: mockStats,
      restartSession: vi.fn().mockResolvedValue(undefined),
    });
  });

  const render_ = () => render(
    <MemoryRouter initialEntries={['/success/deck1']}>
      <Routes><Route path="/success/:deckId" element={<SuccessScreen />} /></Routes>
    </MemoryRouter>
  );

  it('shows cards reviewed count', () => {
    render_();
    expect(screen.getByText('8')).toBeInTheDocument();
  });

  it('shows accuracy percentage', () => {
    render_();
    expect(screen.getByText('75%')).toBeInTheDocument();
  });

  it('shows correct count', () => {
    render_();
    expect(screen.getByText('6')).toBeInTheDocument();
  });
});
