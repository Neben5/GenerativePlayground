/**
 * TickrateMonitor - Tracks and logs simulation tick rate
 */

export class TickrateMonitor {
  private tickCount: number = 0;
  private lastLogTime: number = performance.now();
  private currentTickRate: number = 0;
  private targetTickRate: number;
  private logInterval: number = 1000; // Log every 1000ms
  private monitorIntervalId: number | null = null;
  private isMonitoring: boolean = false;

  constructor(targetTickRate: number) {
    this.targetTickRate = targetTickRate;
    this.startMonitoring();
  }

  /**
   * Call once per simulation tick to increment counter
   */
  public tick(): void {
    this.tickCount++;
  }

  /**
   * Update target tick rate without recreating the monitor
   */
  public setTargetTickRate(newRate: number): void {
    this.targetTickRate = newRate;
  }

  /**
   * Start wall-clock based monitoring (only once)
   */
  private startMonitoring(): void {
    if (this.isMonitoring) return; // Already running, don't start another
    
    this.isMonitoring = true;
    this.monitorIntervalId = window.setInterval(() => {
      const now = performance.now();
      const deltaTime = (now - this.lastLogTime) / 1000;
      
      this.currentTickRate = this.tickCount / deltaTime;
      this.lastLogTime = now;
      this.tickCount = 0;
      
      this.logMetrics();
      this.updateTickrateDisplay();
    }, this.logInterval);
  }

  /**
   * Stop monitoring and clean up
   */
  public destroy(): void {
    if (this.monitorIntervalId !== null) {
      clearInterval(this.monitorIntervalId);
      this.monitorIntervalId = null;
    }
    this.isMonitoring = false;
  }

  /**
   * Log current tick rate to console
   */
  private logMetrics(): void {
    const status = this.currentTickRate >= this.targetTickRate ? '✓' : '✗';
    console.log(
      `${status} TPS: ${this.currentTickRate.toFixed(1)} | ` +
      `Target: ${this.targetTickRate} TPS (${(1000 / this.targetTickRate).toFixed(2)}ms)`
    );
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

  /**
   * Get current tick count value
   */
  public getTickCount(): number {
    return this.tickCount;
  }

  /**
   * Reset the tick rate metrics
   */
  public reset(): void {
    this.tickCount = 0;
    this.lastLogTime = performance.now();
    this.currentTickRate = 0;
  }
}


