/**
 * TickrateMonitor - Tracks and logs simulation tick rate
 */

export class TickrateMonitor {
  private tickCount: number = 0;
  private lastUpdateTime: number = performance.now();
  private lastLogTime: number = performance.now();
  private currentTickRate: number = 0;
  private targetTickRate: number;
  private logInterval: number = 5000; // Log frequency in ms
  private updateTickRateInterval = 500; // Update UI every frequency in ms
  private tickTimes: number[] = [];
  private maxTickTime: number = 0;
  private minTickTime: number = Infinity;

  constructor(targetTickRate: number) {
    this.targetTickRate = targetTickRate;
  }

  /**
   * Call once per simulation tick to update tick rate metrics
   */
  public tick(): void {
    this.tickCount++;
    // Update tick rate every (logInterval) ms
    const now = performance.now();
    const deltaTime = now - this.lastUpdateTime;

    this.tickTimes.push(deltaTime);
    this.maxTickTime = Math.max(this.maxTickTime, deltaTime);
    this.minTickTime = Math.min(this.minTickTime, deltaTime);

    if (deltaTime >= this.updateTickRateInterval) {
      this.currentTickRate = this.tickCount / (deltaTime / 1000.0);
      this.lastUpdateTime = now;
      this.tickCount = 0;
      this.updateTickrateDisplay();
    }
    if (now - this.lastLogTime >= this.logInterval) {
      this.lastLogTime = now;
      this.logMetrics();
    }
    // Update UI with current tick rate
  }

  /**
   * Log current tick rate to console
   */
  private logMetrics(): void {
    const status = this.currentTickRate >= this.targetTickRate ? '✓' : '✗';
    const avgTickTime = this.tickTimes.length > 0
      ? this.tickTimes.reduce((a, b) => a + b, 0) / this.tickTimes.length
      : 0;
    console.log(
      `${status} TPS: ${this.currentTickRate.toFixed(1)} | ` +
      `Avg Tick: ${avgTickTime.toFixed(2)}ms | ` +
      `Min/Max: ${this.minTickTime.toFixed(2)}ms / ${this.maxTickTime.toFixed(2)}ms | ` +
      `Target: ${this.targetTickRate} TPS (${(1000 / this.targetTickRate).toFixed(2)}ms)` +
      (this.currentTickRate < this.targetTickRate ? '\n' + this.tickTimes.toString() : '')
    );
    if (this.currentTickRate < this.targetTickRate) {
      console.log(this.tickTimes)
    }
    this.tickTimes = [];
    this.maxTickTime = 0;
    this.minTickTime = Infinity;
  }

  /**
   * Update tick rate display in the UI
   */
  private updateTickrateDisplay(): void {
    const tickrateDisplay = document.getElementById("tickrateDisplay");
    if (tickrateDisplay) {
      tickrateDisplay.textContent = `Ticks: ${this.currentTickRate.toFixed(1)}/s`;
    }
  }

  /**
   * Get current tick rate value
   */
  public getTickRate(): number {
    return this.currentTickRate;
  }
}
