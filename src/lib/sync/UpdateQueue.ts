/**
 * UpdateQueue - Ensures updates are processed in order
 *
 * Problem: Rapid edits can cause race conditions where:
 * - Update 1 starts (position x=100)
 * - Update 2 starts (position x=200)
 * - Update 2 finishes first
 * - Update 1 finishes second
 * - Result: Object snaps back to x=100 (wrong!)
 *
 * Solution: Queue updates and process them sequentially
 * Each update waits for the previous one to complete before starting.
 */

type UpdateTask = () => Promise<void>;

export class UpdateQueue {
  private queue: UpdateTask[] = [];
  private processing: boolean = false;

  /**
   * Add an update to the queue
   * Returns a promise that resolves when this update completes
   */
  async enqueue(task: UpdateTask): Promise<void> {
    return new Promise((resolve, reject) => {
      this.queue.push(async () => {
        try {
          await task();
          resolve();
        } catch (error) {
          reject(error);
        }
      });

      // Start processing if not already running
      if (!this.processing) {
        this.processQueue();
      }
    });
  }

  /**
   * Process queued updates sequentially
   */
  private async processQueue(): Promise<void> {
    if (this.processing) return;

    this.processing = true;

    while (this.queue.length > 0) {
      const task = this.queue.shift();
      if (task) {
        try {
          await task();
        } catch (error) {
          console.error('[UpdateQueue] Task failed:', error);
          // Continue processing despite error
        }
      }
    }

    this.processing = false;
  }

  /**
   * Get queue size (for debugging)
   */
  size(): number {
    return this.queue.length;
  }

  /**
   * Clear the queue (for cleanup)
   */
  clear(): void {
    this.queue = [];
    this.processing = false;
  }
}

