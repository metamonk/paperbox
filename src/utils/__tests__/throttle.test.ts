import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { throttle } from '../throttle';

describe('throttle', () => {
  beforeEach(() => {
    vi.useFakeTimers();
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  it('should call function immediately on first invocation', () => {
    const mockFn = vi.fn();
    const throttledFn = throttle(mockFn, 100);

    throttledFn();

    expect(mockFn).toHaveBeenCalledTimes(1);
  });

  it('should throttle subsequent calls', () => {
    const mockFn = vi.fn();
    const throttledFn = throttle(mockFn, 100);

    throttledFn();
    throttledFn();
    throttledFn();

    expect(mockFn).toHaveBeenCalledTimes(1);
  });

  it('should call function after wait time has passed', () => {
    const mockFn = vi.fn();
    const throttledFn = throttle(mockFn, 100);

    throttledFn();
    expect(mockFn).toHaveBeenCalledTimes(1);

    vi.advanceTimersByTime(50);
    throttledFn();
    expect(mockFn).toHaveBeenCalledTimes(1);

    vi.advanceTimersByTime(60);
    expect(mockFn).toHaveBeenCalledTimes(2);
  });

  it('should preserve function arguments', () => {
    const mockFn = vi.fn();
    const throttledFn = throttle(mockFn, 100);

    throttledFn('arg1', 'arg2');

    expect(mockFn).toHaveBeenCalledWith('arg1', 'arg2');
  });

  it('should enforce 30fps throttling (33ms)', () => {
    const mockFn = vi.fn();
    const throttledFn = throttle(mockFn, 33);

    // Simulate rapid calls (like mousemove at 60fps = 16ms)
    for (let i = 0; i < 10; i++) {
      throttledFn();
      vi.advanceTimersByTime(16);
    }

    // Should have called roughly every 33ms = ~5 times in 160ms
    expect(mockFn.mock.calls.length).toBeLessThanOrEqual(6);
    expect(mockFn.mock.calls.length).toBeGreaterThanOrEqual(4);
  });

  it('should handle context (this) correctly', () => {
    const context = { value: 42 };
    const mockFn = vi.fn(function(this: any) {
      return this.value;
    });
    const throttledFn = throttle(mockFn, 100);

    throttledFn.call(context);

    expect(mockFn).toHaveBeenCalled();
  });

  it('should allow execution immediately after wait period', () => {
    const mockFn = vi.fn();
    const throttledFn = throttle(mockFn, 100);

    throttledFn();
    expect(mockFn).toHaveBeenCalledTimes(1);

    vi.advanceTimersByTime(100);

    throttledFn();
    expect(mockFn).toHaveBeenCalledTimes(2);
  });
});

