/**
 * DebugConfig - Unified debug configuration and monitoring
 * Consolidates FPS, tick rate, and other debug settings
 */

import { FramerateMonitor } from "./FramerateMonitor";
import { TickrateMonitor } from "./TickrateMonitor";

// Extend the monitors to accept a logging callback
class ConfigurableFramerateMonitor extends FramerateMonitor {
  private loggingEnabled: boolean = false;
  
  public setLoggingEnabled(enabled: boolean): void {
    this.loggingEnabled = enabled;
  }
  
  protected logMetrics(): void {
    if (this.loggingEnabled) {
      super['logMetrics']();
    }
  }
}

class ConfigurableTickrateMonitor extends TickrateMonitor {
  private loggingEnabled: boolean = false;
  
  public setLoggingEnabled(enabled: boolean): void {
    this.loggingEnabled = enabled;
  }
  
  protected logMetrics(): void {
    if (this.loggingEnabled) {
      super['logMetrics']();
    }
  }
}

export class DebugConfig {
  // Monitors
  public framerateMonitor: ConfigurableFramerateMonitor;
  public tickrateMonitor: ConfigurableTickrateMonitor;
  
  // Display settings
  private fpsDisplayElement: HTMLElement | null = null;
  private tickrateDisplayElement: HTMLElement | null = null;
  
  // Configuration
  public showFPS: boolean = true;
  public showTickRate: boolean = true;
  public consoleLogging: boolean = false;
  public targetFPS: number = 60;
  
  // ECA and Rule debug settings
  public ecaIterationDebug: boolean = false;
  public ruleIterationDebug: boolean = false;
  
  constructor() {
    this.framerateMonitor = new ConfigurableFramerateMonitor(this.targetFPS);
    this.tickrateMonitor = new ConfigurableTickrateMonitor(0);
    
    // Initialize display elements
    this.initializeDisplays();
  }
  
  /**
   * Initialize or create debug display elements
   */
  private initializeDisplays(): void {
    // FPS Display
    this.fpsDisplayElement = document.getElementById("fpsDisplay");
    if (!this.fpsDisplayElement) {
      this.fpsDisplayElement = this.createDebugDisplay("fpsDisplay", "top: 10px;");
    }
    
    // Tick Rate Display
    this.tickrateDisplayElement = document.getElementById("tickrateDisplay");
    if (!this.tickrateDisplayElement) {
      this.tickrateDisplayElement = this.createDebugDisplay("tickrateDisplay", "top: 35px;");
    }
    
    this.updateDisplayVisibility();
  }
  
  /**
   * Create a debug display element
   */
  private createDebugDisplay(id: string, positionStyle: string): HTMLElement {
    const element = document.createElement("div");
    element.id = id;
    element.style.cssText = `
      position: fixed;
      ${positionStyle}
      right: 10px;
      background: rgba(0, 0, 0, 0.7);
      color: #0f0;
      padding: 8px 12px;
      font-family: monospace;
      border-radius: 4px;
      z-index: 100;
    `;
    document.body.appendChild(element);
    return element;
  }
  
  /**
   * Update visibility of debug displays
   */
  private updateDisplayVisibility(): void {
    if (this.fpsDisplayElement) {
      this.fpsDisplayElement.style.display = this.showFPS ? "block" : "none";
    }
    if (this.tickrateDisplayElement) {
      this.tickrateDisplayElement.style.display = this.showTickRate ? "block" : "none";
    }
  }
  
  /**
   * Toggle FPS display
   */
  public toggleFPS(show: boolean): void {
    this.showFPS = show;
    this.updateDisplayVisibility();
  }
  
  /**
   * Toggle tick rate display
   */
  public toggleTickRate(show: boolean): void {
    this.showTickRate = show;
    this.updateDisplayVisibility();
  }
  
  /**
   * Toggle console logging
   */
  public toggleConsoleLogging(enabled: boolean): void {
    this.consoleLogging = enabled;
    this.framerateMonitor.setLoggingEnabled(enabled);
    this.tickrateMonitor.setLoggingEnabled(enabled);
  }
  
  
  /**
   * Get current FPS
   */
  public getCurrentFPS(): number {
    return this.framerateMonitor.getFPS();
  }
  
  /**
   * Get current tick rate
   */
  public getCurrentTickRate(): number {
    return this.tickrateMonitor.getTickRate();
  }
  
  /**
   * Set ECA iteration debug
   */
  public setECAIterationDebug(enabled: boolean): void {
    this.ecaIterationDebug = enabled;
  }
  
  /**
   * Set rule iteration debug
   */
  public setRuleIterationDebug(enabled: boolean): void {
    this.ruleIterationDebug = enabled;
  }
  
  /**
   * Get ECA iteration debug status
   */
  public getECAIterationDebug(): boolean {
    return this.ecaIterationDebug;
  }
  
  /**
   * Get rule iteration debug status
   */
  public getRuleIterationDebug(): boolean {
    return this.ruleIterationDebug;
  }
  
  /**
   * Cleanup
   */
  public destroy(): void {
    this.tickrateMonitor.destroy();
    if (this.fpsDisplayElement) {
      this.fpsDisplayElement.remove();
    }
    if (this.tickrateDisplayElement) {
      this.tickrateDisplayElement.remove();
    }
  }
}

// Singleton instance
let debugConfig: DebugConfig | null = null;

/**
 * Get or create the debug config instance
 */
export function getDebugConfig(): DebugConfig {
  if (!debugConfig) {
    debugConfig = new DebugConfig();
  }
  return debugConfig;
}

/**
 * Reset debug config
 */
export function resetDebugConfig(): void {
  if (debugConfig) {
    debugConfig.destroy();
    debugConfig = null;
  }
}
