/**
 * FramerateMonitor - Tracks and logs FPS metrics for performance monitoring
 * Targets 30 FPS for large grid rendering
 */

export class FramerateMonitor {
  private frameCount: number = 0;
  private lastTime: number = performance.now();
  private currentFPS: number = 0;
  private targetFPS: number = 30;
  private logInterval: number = 30; // Log every 30 frames
  private maxFrameTime: number = 0;
  private minFrameTime: number = Infinity;
  private frameTimes: number[] = [];

  constructor(targetFPS: number = 30) {
    this.targetFPS = targetFPS;
  }

  /**
   * Call once per frame to update FPS metrics
   */
  public tick(): void {
    const now = performance.now();
    const deltaTime = now - this.lastTime;
    this.lastTime = now;

    this.frameCount++;
    this.frameTimes.push(deltaTime);
    this.maxFrameTime = Math.max(this.maxFrameTime, deltaTime);
    this.minFrameTime = Math.min(this.minFrameTime, deltaTime);

    // Update FPS every 30 frames
    if (this.frameCount % this.logInterval === 0) {
      this.currentFPS = 1000 / (deltaTime || 1); // Calculate FPS from last frame time
      this.logMetrics();
      this.resetFrameMetrics();
    }

    // Update UI with current FPS
    this.updateFPSDisplay();
  }

  /**
   * Log current performance metrics to console
   */
  protected logMetrics(): void {
    const avgFrameTime = this.frameTimes.length > 0
      ? this.frameTimes.reduce((a, b) => a + b, 0) / this.frameTimes.length
      : 0;

    const targetFrameTime = 1000 / this.targetFPS;
    const status = this.currentFPS >= this.targetFPS ? '✓' : '✗';

    console.log(
      `${status} FPS: ${this.currentFPS.toFixed(1)} | ` +
      `Avg Frame: ${avgFrameTime.toFixed(2)}ms | ` +
      `Min/Max: ${this.minFrameTime.toFixed(2)}ms / ${this.maxFrameTime.toFixed(2)}ms | ` +
      `Target: ${this.targetFPS} FPS (${targetFrameTime.toFixed(2)}ms)`
    );
  }

  /**
   * Reset frame metrics after logging
   */
  private resetFrameMetrics(): void {
    this.frameTimes = [];
    this.maxFrameTime = 0;
    this.minFrameTime = Infinity;
  }

  /**
   * Update FPS display in the UI
   */
  private updateFPSDisplay(): void {
    const fpsDisplay = document.getElementById("fpsDisplay");
    if (fpsDisplay) {
      fpsDisplay.textContent = `FPS: ${this.currentFPS.toFixed(1)}`;
    }
  }

  /**
   * Get current FPS value
   */
  public getFPS(): number {
    return this.currentFPS;
  }

  /**
   * Check if current FPS meets target
   */
  public isMeetingTarget(): boolean {
    return this.currentFPS >= this.targetFPS * 0.95; // 95% of target
  }

  /**
   * Set target FPS
   */
  public setTargetFPS(fps: number): void {
    this.targetFPS = fps;
  }
}
