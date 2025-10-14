import { describe, it, expect, vi } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';
import { Toolbar } from '../Toolbar';

describe('Toolbar', () => {
  it('should render all shape creation buttons', () => {
    const mockAddShape = vi.fn();

    render(<Toolbar onAddShape={mockAddShape} />);

    expect(screen.getByText(/rectangle/i)).toBeInTheDocument();
    expect(screen.getByText(/circle/i)).toBeInTheDocument();
    expect(screen.getByText(/text/i)).toBeInTheDocument();
  });

  it('should call onAddShape with rectangle type', () => {
    const mockAddShape = vi.fn();

    render(<Toolbar onAddShape={mockAddShape} />);

    const rectangleButton = screen.getByText(/rectangle/i);
    fireEvent.click(rectangleButton);

    expect(mockAddShape).toHaveBeenCalledWith('rectangle');
    expect(mockAddShape).toHaveBeenCalledTimes(1);
  });

  it('should call onAddShape with circle type', () => {
    const mockAddShape = vi.fn();

    render(<Toolbar onAddShape={mockAddShape} />);

    const circleButton = screen.getByText(/circle/i);
    fireEvent.click(circleButton);

    expect(mockAddShape).toHaveBeenCalledWith('circle');
    expect(mockAddShape).toHaveBeenCalledTimes(1);
  });

  it('should call onAddShape with text type', () => {
    const mockAddShape = vi.fn();

    render(<Toolbar onAddShape={mockAddShape} />);

    const textButton = screen.getByText(/text/i);
    fireEvent.click(textButton);

    expect(mockAddShape).toHaveBeenCalledWith('text');
    expect(mockAddShape).toHaveBeenCalledTimes(1);
  });

  it('should allow multiple shape creations', () => {
    const mockAddShape = vi.fn();

    render(<Toolbar onAddShape={mockAddShape} />);

    const rectangleButton = screen.getByText(/rectangle/i);
    const circleButton = screen.getByText(/circle/i);

    fireEvent.click(rectangleButton);
    fireEvent.click(circleButton);
    fireEvent.click(rectangleButton);

    expect(mockAddShape).toHaveBeenCalledTimes(3);
    expect(mockAddShape).toHaveBeenNthCalledWith(1, 'rectangle');
    expect(mockAddShape).toHaveBeenNthCalledWith(2, 'circle');
    expect(mockAddShape).toHaveBeenNthCalledWith(3, 'rectangle');
  });

  it('should have proper button styling', () => {
    const mockAddShape = vi.fn();

    render(<Toolbar onAddShape={mockAddShape} />);

    const rectangleButton = screen.getByText(/rectangle/i).closest('button');
    const circleButton = screen.getByText(/circle/i).closest('button');
    const textButton = screen.getByText(/text/i).closest('button');

    expect(rectangleButton).toHaveClass('bg-blue-500');
    expect(circleButton).toHaveClass('bg-red-500');
    expect(textButton).toHaveClass('bg-gray-700');
  });
});

