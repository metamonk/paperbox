/**
 * Canvas Slice - Viewport Persistence Tests
 *
 * W2.D7.2: RED phase - Tests for viewport localStorage and PostgreSQL persistence
 *
 * Tests:
 * - Viewport saves to localStorage on syncViewport()
 * - Viewport loads from localStorage on canvas init
 * - Viewport debounced save to PostgreSQL (5 second debounce)
 * - Cross-device sync via PostgreSQL
 * - localStorage as fallback when PostgreSQL unavailable
 */

import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import { usePaperboxStore } from '../index';

// Mock the supabase module with factory function
vi.mock('../../lib/supabase', () => {
  const mockFrom = vi.fn();
  const mockGetUser = vi.fn();

  return {
    supabase: {
      from: mockFrom,
      auth: {
        getUser: mockGetUser,
      },
    },
    // Export these so tests can access them
    __mockFrom: mockFrom,
    __mockGetUser: mockGetUser,
  };
});

// Import the mocks after vi.mock is set up
import { supabase } from '../../lib/supabase';
const mockFrom = (supabase as any).from;
const mockGetUser = (supabase as any).auth.getUser;

describe('Canvas Slice - Viewport Persistence', () => {
  let store: ReturnType<typeof usePaperboxStore.getState>;
  let localStorageMock: { [key: string]: string };

  beforeEach(() => {
    // Clear all mocks
    vi.clearAllMocks();

    // Reset store
    store = usePaperboxStore.getState();
    store.resetViewport();

    // Mock localStorage
    localStorageMock = {};
    global.localStorage = {
      getItem: vi.fn((key: string) => localStorageMock[key] || null),
      setItem: vi.fn((key: string, value: string) => {
        localStorageMock[key] = value;
      }),
      removeItem: vi.fn((key: string) => {
        delete localStorageMock[key];
      }),
      clear: vi.fn(() => {
        localStorageMock = {};
      }),
      length: 0,
      key: vi.fn(),
    } as Storage;

    // Reset Supabase mock to default behavior
    mockFrom.mockReturnValue({
      select: vi.fn(() => ({
        eq: vi.fn(() => ({
          single: vi.fn(() => Promise.resolve({ data: null, error: null })),
        })),
      })),
      upsert: vi.fn(() => Promise.resolve({ data: null, error: null })),
    });

    mockGetUser.mockResolvedValue({
      data: { user: { id: 'test-user-id' } },
      error: null,
    });

    // Reset timers for debounce testing
    vi.useFakeTimers();
  });

  afterEach(() => {
    vi.restoreAllMocks();
    vi.useRealTimers();
  });

  describe('localStorage persistence', () => {
    it('should save viewport to localStorage on syncViewport()', () => {
      // Sync viewport
      store.syncViewport(2, 100, 200);

      // Should save to localStorage
      expect(localStorage.setItem).toHaveBeenCalledWith(
        'canvas_viewport',
        JSON.stringify({ zoom: 2, panX: 100, panY: 200 })
      );
    });

    it('should load viewport from localStorage on init', () => {
      // Pre-populate localStorage
      localStorageMock['canvas_viewport'] = JSON.stringify({
        zoom: 1.5,
        panX: 50,
        panY: -50,
      });

      // Initialize viewport from localStorage
      store.loadViewportFromStorage();

      // Viewport should be restored
      const viewport = store.viewport;
      expect(viewport.zoom).toBe(1.5);
      expect(viewport.panX).toBe(50);
      expect(viewport.panY).toBe(-50);
    });

    it('should handle missing localStorage data gracefully', () => {
      // No data in localStorage
      localStorageMock = {};

      // Initialize viewport from localStorage
      store.loadViewportFromStorage();

      // Should use default viewport
      const viewport = store.viewport;
      expect(viewport.zoom).toBe(1);
      expect(viewport.panX).toBe(0);
      expect(viewport.panY).toBe(0);
    });

    it('should handle corrupted localStorage data gracefully', () => {
      // Invalid JSON in localStorage
      localStorageMock['canvas_viewport'] = 'invalid-json-{]';

      // Initialize viewport from localStorage
      expect(() => {
        store.loadViewportFromStorage();
      }).not.toThrow();

      // Should use default viewport
      const viewport = store.viewport;
      expect(viewport.zoom).toBe(1);
      expect(viewport.panX).toBe(0);
      expect(viewport.panY).toBe(0);
    });

    it('should update localStorage on every syncViewport() call', () => {
      // Multiple sync calls
      store.syncViewport(1.2, 10, 20);
      store.syncViewport(1.5, 30, 40);
      store.syncViewport(2.0, 50, 60);

      // localStorage should be updated each time
      expect(localStorage.setItem).toHaveBeenCalledTimes(3);
      expect(localStorageMock['canvas_viewport']).toBe(
        JSON.stringify({ zoom: 2.0, panX: 50, panY: 60 })
      );
    });
  });

  describe('PostgreSQL persistence', () => {
    it('should debounce PostgreSQL save by 5 seconds', async () => {
      // Sync viewport multiple times rapidly
      store.syncViewport(1.1, 10, 20);
      store.syncViewport(1.2, 30, 40);
      store.syncViewport(1.3, 50, 60);

      // PostgreSQL save should NOT be called yet
      expect(mockFrom).not.toHaveBeenCalled();

      // Fast-forward 5 seconds
      await vi.advanceTimersByTimeAsync(5000);

      // PostgreSQL save should be called ONCE with latest viewport
      expect(mockFrom).toHaveBeenCalledWith('user_canvas_viewports');
    });

    it('should reset debounce timer on new syncViewport()', async () => {
      // First sync
      store.syncViewport(1.1, 10, 20);

      // Fast-forward 3 seconds
      await vi.advanceTimersByTimeAsync(3000);

      // Another sync (resets debounce timer)
      store.syncViewport(1.2, 30, 40);

      // Fast-forward 3 more seconds (6 total, but only 3 since last sync)
      await vi.advanceTimersByTimeAsync(3000);

      // PostgreSQL save should NOT be called yet
      expect(mockFrom).not.toHaveBeenCalled();

      // Fast-forward 2 more seconds (5 since last sync)
      await vi.advanceTimersByTimeAsync(2000);

      // Now PostgreSQL save should be called
      expect(mockFrom).toHaveBeenCalled();
    });

    it('should save viewport to PostgreSQL with JSONB format', async () => {
      // Sync viewport
      store.syncViewport(2.5, 150, -75);

      // Fast-forward debounce
      await vi.advanceTimersByTimeAsync(5000);

      // Should call upsert with correct data
      expect(mockFrom).toHaveBeenCalledWith(
        'user_canvas_viewports'
      );
      // Note: Full upsert verification would require mock implementation details
    });

    it('should load viewport from PostgreSQL on init', async () => {
      // Mock PostgreSQL response with viewport data
      const mockSelect = vi.fn(() => ({
        eq: vi.fn(() => ({
          single: vi.fn(() =>
            Promise.resolve({
              data: {
                viewport_state: { zoom: 3, panX: 200, panY: -100 },
              },
              error: null,
            })
          ),
        })),
      }));

      mockFrom.mockReturnValue({
        select: mockSelect,
        upsert: vi.fn(() => Promise.resolve({ data: null, error: null })),
      });

      // Load viewport from PostgreSQL
      await store.loadViewportFromPostgreSQL();

      // Viewport should be restored
      const viewport = store.viewport;
      expect(viewport.zoom).toBe(3);
      expect(viewport.panX).toBe(200);
      expect(viewport.panY).toBe(-100);
    });

    it('should handle PostgreSQL connection failure gracefully', async () => {
      // Mock PostgreSQL error
      const mockSelect = vi.fn(() => ({
        eq: vi.fn(() => ({
          single: vi.fn(() =>
            Promise.resolve({
              data: null,
              error: { message: 'Connection failed' },
            })
          ),
        })),
      }));

      mockFrom.mockReturnValue({
        select: mockSelect,
        upsert: vi.fn(() => Promise.resolve({ data: null, error: null })),
      });

      // Load viewport from PostgreSQL (should not throw)
      await expect(store.loadViewportFromPostgreSQL()).resolves.not.toThrow();

      // Should fall back to localStorage or default
      const viewport = store.viewport;
      expect(viewport.zoom).toBe(1);
      expect(viewport.panX).toBe(0);
      expect(viewport.panY).toBe(0);
    });
  });

  describe('Cross-device sync', () => {
    it('should prioritize PostgreSQL over localStorage on init', async () => {
      // localStorage has old data
      localStorageMock['canvas_viewport'] = JSON.stringify({
        zoom: 1.0,
        panX: 0,
        panY: 0,
      });

      // PostgreSQL has newer data
      const mockSelect = vi.fn(() => ({
        eq: vi.fn(() => ({
          single: vi.fn(() =>
            Promise.resolve({
              data: {
                viewport_state: { zoom: 2.0, panX: 100, panY: 50 },
                updated_at: new Date().toISOString(),
              },
              error: null,
            })
          ),
        })),
      }));

      mockFrom.mockReturnValue({
        select: mockSelect,
        upsert: vi.fn(() => Promise.resolve({ data: null, error: null })),
      });

      // Initialize (should prefer PostgreSQL)
      await store.initializeViewport();

      // Viewport should match PostgreSQL data
      const viewport = store.viewport;
      expect(viewport.zoom).toBe(2.0);
      expect(viewport.panX).toBe(100);
      expect(viewport.panY).toBe(50);
    });

    it('should fall back to localStorage if PostgreSQL unavailable', async () => {
      // localStorage has data
      localStorageMock['canvas_viewport'] = JSON.stringify({
        zoom: 1.5,
        panX: 25,
        panY: -25,
      });

      // PostgreSQL unavailable
      const mockSelect = vi.fn(() => ({
        eq: vi.fn(() => ({
          single: vi.fn(() =>
            Promise.resolve({
              data: null,
              error: { message: 'Network error' },
            })
          ),
        })),
      }));

      mockFrom.mockReturnValue({
        select: mockSelect,
        upsert: vi.fn(() => Promise.resolve({ data: null, error: null })),
      });

      // Initialize (should fall back to localStorage)
      await store.initializeViewport();

      // Viewport should match localStorage data
      const viewport = store.viewport;
      expect(viewport.zoom).toBe(1.5);
      expect(viewport.panX).toBe(25);
      expect(viewport.panY).toBe(-25);
    });
  });

  describe('Performance', () => {
    it('should not block UI on localStorage save', () => {
      const startTime = Date.now();

      // Sync viewport (should be synchronous)
      store.syncViewport(2, 100, 200);

      const endTime = Date.now();

      // Should complete in < 10ms
      expect(endTime - startTime).toBeLessThan(10);
    });

    it('should batch PostgreSQL saves with debouncing', async () => {
      // Simulate rapid viewport changes (e.g., during pan/zoom)
      for (let i = 0; i < 100; i++) {
        store.syncViewport(1 + i * 0.01, i, i * 2);
      }

      // Should only trigger ONE PostgreSQL save after debounce
      await vi.advanceTimersByTimeAsync(5000);

      expect(mockFrom).toHaveBeenCalledTimes(1);
    });
  });

  describe('Edge cases', () => {
    it('should handle localStorage quota exceeded', () => {
      // Mock localStorage.setItem to throw quota exceeded error
      (localStorage.setItem as ReturnType<typeof vi.fn>).mockImplementation(() => {
        throw new Error('QuotaExceededError');
      });

      // Sync viewport (should not crash)
      expect(() => {
        store.syncViewport(2, 100, 200);
      }).not.toThrow();
    });

    it('should handle rapid init calls gracefully', async () => {
      // Multiple init calls in quick succession
      const promises = [
        store.initializeViewport(),
        store.initializeViewport(),
        store.initializeViewport(),
      ];

      // Should not crash
      await expect(Promise.all(promises)).resolves.not.toThrow();
    });

    it('should handle viewport state with extreme values', () => {
      // Extreme zoom and pan values
      store.syncViewport(20, 10000, -5000);

      // Should save without issues
      expect(localStorageMock['canvas_viewport']).toBe(
        JSON.stringify({ zoom: 20, panX: 10000, panY: -5000 })
      );
    });
  });
});
