import { describe, it, expect, vi } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';
import StudyCard from '../study/StudyCard';

const card = { id: 'c1', front: 'What is 2+2?', back: '4', tags: [], created_at: 0 };

describe('StudyCard', () => {
  it('renders front text initially', () => {
    render(<StudyCard card={card} onRate={vi.fn()} />);
    expect(screen.getByText('What is 2+2?')).toBeInTheDocument();
    expect(screen.queryByText('Again')).not.toBeInTheDocument();
  });

  it('shows rating buttons after click', () => {
    render(<StudyCard card={card} onRate={vi.fn()} />);
    fireEvent.click(document.querySelector('.study-card')!);
    expect(screen.getByText('Again')).toBeInTheDocument();
    expect(screen.getByText('Good')).toBeInTheDocument();
  });

  it('calls onRate with 0 when Again clicked', () => {
    const onRate = vi.fn();
    render(<StudyCard card={card} onRate={onRate} />);
    fireEvent.click(document.querySelector('.study-card')!);
    fireEvent.click(screen.getByText('Again'));
    expect(onRate).toHaveBeenCalledWith(0);
  });

  it('calls onRate with 3 when Good clicked', () => {
    const onRate = vi.fn();
    render(<StudyCard card={card} onRate={onRate} />);
    fireEvent.click(document.querySelector('.study-card')!);
    fireEvent.click(screen.getByText('Good'));
    expect(onRate).toHaveBeenCalledWith(3);
  });

  it('resets flip state when card changes', () => {
    const { rerender } = render(<StudyCard card={card} onRate={vi.fn()} />);
    fireEvent.click(document.querySelector('.study-card')!);
    expect(screen.getByText('Again')).toBeInTheDocument();
    const card2 = { ...card, id: 'c2', front: 'New question' };
    rerender(<StudyCard card={card2} onRate={vi.fn()} />);
    expect(screen.queryByText('Again')).not.toBeInTheDocument();
  });
});
