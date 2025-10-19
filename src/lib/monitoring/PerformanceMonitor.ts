/**
 * PerformanceMonitor - Track sync latencies and performance metrics
 *
 * FOUNDATION.md Requirements:
 * - Sub-100ms object sync
 * - Sub-50ms cursor sync
 * - Zero visible lag during rapid multi-user edits
 *
 * This monitor tracks operation latencies and alerts on violations.
 */

/**
 * Performance operation types
 */
export type PerformanceOperation =
  | 'object_sync'       // Object property updates (target: <100ms)
  | 'cursor_sync'       // Cursor position updates (target: <50ms)
  | 'lock_acquisition'  // Lock request to database (target: <100ms)
  | 'lock_release'      // Lock release to database (target: <100ms)
  | 'selection_sync'    // Selection state broadcast (target: <50ms)
  | 'canvas_render';    // Canvas re-render time (target: <16.67ms for 60fps)

/**
 * Performance thresholds (milliseconds)
 */
export const PERFORMANCE_THRESHOLDS: Record<PerformanceOperation, number> = {
  object_sync: 100,       // FOUNDATION.md: Sub-100ms object sync
  cursor_sync: 50,        // FOUNDATION.md: Sub-50ms cursor sync
  lock_acquisition: 100,  // Reasonable for database operation
  lock_release: 100,      // Reasonable for database operation
  selection_sync: 50,     // Should be as fast as cursor sync
  canvas_render: 16.67,   // 60fps requirement
};

/**
 * Performance metric data
 */
interface PerformanceMetric {
  operation: PerformanceOperation;
  duration: number;
  timestamp: number;
}

/**
 * Performance statistics
 */
export interface PerformanceStats {
  operation: PerformanceOperation;
  count: number;
  min: number;
  max: number;
  avg: number;
  p50: number;  // Median
  p95: number;  // 95th percentile
  p99: number;  // 99th percentile
  violations: number; // Count of threshold violations
  violationRate: number; // Percentage of violations
}

/**
 * PerformanceMonitor singleton class
 */
export class PerformanceMonitor {
  private metrics: Map<PerformanceOperation, PerformanceMetric[]> = new Map();
  private maxMetricsPerOperation = 1000; // Keep last 1000 measurements
  private alertOnViolation = true;

  /**
   * Track a performance measurement
   */
  track(operation: PerformanceOperation, duration: number): void {
    // Store metric
    if (!this.metrics.has(operation)) {
      this.metrics.set(operation, []);
    }

    const metrics = this.metrics.get(operation)!;
    metrics.push({
      operation,
      duration,
      timestamp: Date.now(),
    });

    // Limit stored metrics to prevent memory growth
    if (metrics.length > this.maxMetricsPerOperation) {
      metrics.shift(); // Remove oldest
    }

    // Alert on threshold violations
    const threshold = PERFORMANCE_THRESHOLDS[operation];
    if (this.alertOnViolation && duration > threshold) {
      console.warn(
        `⚠️ Performance violation: ${operation} took ${duration.toFixed(2)}ms (threshold: ${threshold}ms)`
      );
    }
  }

  /**
   * Start timing an operation
   * Returns a function to stop timing and record the measurement
   */
  startTimer(operation: PerformanceOperation): () => void {
    const start = performance.now();
    return () => {
      const duration = performance.now() - start;
      this.track(operation, duration);
    };
  }

  /**
   * Get statistics for an operation
   */
  getStats(operation: PerformanceOperation): PerformanceStats | null {
    const metrics = this.metrics.get(operation);
    if (!metrics || metrics.length === 0) {
      return null;
    }

    const durations = metrics.map(m => m.duration).sort((a, b) => a - b);
    const threshold = PERFORMANCE_THRESHOLDS[operation];
    const violations = durations.filter(d => d > threshold).length;

    return {
      operation,
      count: durations.length,
      min: Math.min(...durations),
      max: Math.max(...durations),
      avg: durations.reduce((a, b) => a + b, 0) / durations.length,
      p50: this.percentile(durations, 0.50),
      p95: this.percentile(durations, 0.95),
      p99: this.percentile(durations, 0.99),
      violations,
      violationRate: (violations / durations.length) * 100,
    };
  }

  /**
   * Get all statistics
   */
  getAllStats(): PerformanceStats[] {
    const stats: PerformanceStats[] = [];
    for (const operation of this.metrics.keys()) {
      const stat = this.getStats(operation);
      if (stat) {
        stats.push(stat);
      }
    }
    return stats;
  }

  /**
   * Print performance report to console
   */
  printReport(): void {
    const stats = this.getAllStats();
    if (stats.length === 0) {
      console.log('📊 No performance metrics collected yet');
      return;
    }

    console.log('\n📊 Performance Report');
    console.log('═'.repeat(80));

    stats.forEach(stat => {
      const threshold = PERFORMANCE_THRESHOLDS[stat.operation];
      const statusIcon = stat.violationRate > 10 ? '🔴' : stat.violationRate > 0 ? '🟡' : '✅';

      console.log(`\n${statusIcon} ${stat.operation}`);
      console.log(`   Measurements: ${stat.count}`);
      console.log(`   Range: ${stat.min.toFixed(2)}ms - ${stat.max.toFixed(2)}ms`);
      console.log(`   Average: ${stat.avg.toFixed(2)}ms`);
      console.log(`   P50: ${stat.p50.toFixed(2)}ms | P95: ${stat.p95.toFixed(2)}ms | P99: ${stat.p99.toFixed(2)}ms`);
      console.log(`   Threshold: ${threshold}ms | Violations: ${stat.violations} (${stat.violationRate.toFixed(1)}%)`);
    });

    console.log('\n' + '═'.repeat(80));
  }

  /**
   * Reset all metrics
   */
  reset(): void {
    this.metrics.clear();
  }

  /**
   * Calculate percentile from sorted array
   */
  private percentile(sortedValues: number[], percentile: number): number {
    if (sortedValues.length === 0) return 0;
    const index = Math.ceil(sortedValues.length * percentile) - 1;
    return sortedValues[Math.max(0, index)];
  }

  /**
   * Enable or disable alerts for threshold violations
   */
  setAlertOnViolation(enabled: boolean): void {
    this.alertOnViolation = enabled;
  }
}

/**
 * Singleton instance
 */
export const perfMonitor = new PerformanceMonitor();

/**
 * Convenience function to wrap async operations with performance tracking
 */
export async function trackPerformance<T>(
  operation: PerformanceOperation,
  fn: () => Promise<T>
): Promise<T> {
  const stopTimer = perfMonitor.startTimer(operation);
  try {
    return await fn();
  } finally {
    stopTimer();
  }
}

/**
 * Convenience function to wrap sync operations with performance tracking
 */
export function trackPerformanceSync<T>(
  operation: PerformanceOperation,
  fn: () => T
): T {
  const stopTimer = perfMonitor.startTimer(operation);
  try {
    return fn();
  } finally {
    stopTimer();
  }
}
