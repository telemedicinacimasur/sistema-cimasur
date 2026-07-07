
export interface AutomationMetrics {
  started: number;
  completed: number;
  failed: number;
  retries: number;
  totalDurationMs: number;
}

export class MetricsManager {
  private metrics: AutomationMetrics = {
    started: 0,
    completed: 0,
    failed: 0,
    retries: 0,
    totalDurationMs: 0
  };
  private firstStartTime: number | null = null;
  private lastEndTime: number | null = null;
  private durations: number[] = [];

  public recordStart() {
    if (!this.firstStartTime) this.firstStartTime = Date.now();
    this.metrics.started++;
  }

  public recordCompletion(durationMs: number) {
    this.metrics.completed++;
    this.metrics.totalDurationMs += durationMs;
    this.durations.push(durationMs);
    this.lastEndTime = Date.now();
  }
  
  public getThroughput(): number {
      if (!this.firstStartTime || !this.lastEndTime) return 0;
      const durationSeconds = (this.lastEndTime - this.firstStartTime) / 1000;
      return durationSeconds > 0 ? this.metrics.completed / durationSeconds : 0;
  }

  public getLatencyStats() {
      if (this.durations.length === 0) return { avg: 0, p95: 0, max: 0 };
      const sorted = [...this.durations].sort((a, b) => a - b);
      const avg = this.metrics.totalDurationMs / this.metrics.completed;
      const max = sorted[sorted.length - 1];
      const p95 = sorted[Math.floor(sorted.length * 0.95)];
      return { avg, p95, max };
  }

  public recordFailure() {
    this.metrics.failed++;
  }

  public recordRetry() {
    this.metrics.retries++;
  }

  public getMetrics(): AutomationMetrics {
    return { ...this.metrics };
  }
}
