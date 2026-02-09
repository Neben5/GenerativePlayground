import { Vector } from "@geometric/vector";
import { CellSpace, Cell } from "./Cells";
import { CARule, NeighborhoodType, NEIGHBORHOOD_METADATA } from "./CARule";
import { Rule110 } from "./Rule110";
import { SandRule } from "./SandRule";
import { getDebugConfig } from "./DebugConfig";

// Simple Bounds interface to replace Paper.js Rectangle
export interface Bounds {
  left: number;
  top: number;
  width: number;
  height: number;
}
var caCount = 0;
var POSSIBLESTATES = 2;
var DIMENSIONORDERS = [8, 2];
var TICKRATE = 60;
var STOP = true;

var tickLoopIntervalId: NodeJS.Timeout = null;
var renderLoopId: number = null; // requestAnimationFrame ID

class CanvasSpace {
  boundingRect: Bounds;
  height_count: number;
  width_count: number;
  width_per_rectangle: number;
  height_per_rectangle: number;
  canvasElement: HTMLCanvasElement;
  ctx: CanvasRenderingContext2D;
  public caCount: number;
  constructor(
    height: number,
    width: number,
    boundingRect: Bounds,
    canvasElement: HTMLCanvasElement
  ) {
    console.log(`CanvasSpace{height: ${height}, width: ${width}, boundingRect: ${JSON.stringify(boundingRect)}}`);
    this.boundingRect = boundingRect;
    this.height_count = height;
    this.width_count = width;
    this.width_per_rectangle = boundingRect.width / this.width_count;
    this.height_per_rectangle = boundingRect.height / this.height_count;
    this.canvasElement = canvasElement;
    this.ctx = canvasElement.getContext("2d");
    const dpr = window.devicePixelRatio || 1;
    const rect = this.canvasElement.getBoundingClientRect();
    this.caCount = caCount;
    // Set logical size
    this.canvasElement.width = rect.width * dpr;
    this.canvasElement.height = rect.height * dpr;

    // Scale context to match
    this.ctx.imageSmoothingEnabled = false;
    this.ctx.scale(dpr, dpr);
    if (!this.ctx) {
      throw new Error("Failed to get 2D context from canvas");
    }
  }

  /**
   * Draw all cells using Canvas 2D fillRect - much faster than Paper.js
   */
  drawElements(ca: CA) {
    // Clear canvas
    this.ctx.fillStyle = "white";
    this.ctx.fillRect(0, 0, this.canvasElement.width, this.canvasElement.height);

    // Draw all cells
    // column loop
    for (var j = 0; j < this.width_count; j++) {
      // row loop
      for (var i = 0; i < this.height_count; i++) {
        var position = new Vector(i, j);
        var state = ca.getCell(position).state;

        const x = this.boundingRect.left + j * this.width_per_rectangle;
        const y = this.boundingRect.top + i * this.height_per_rectangle;
        const w = this.width_per_rectangle;
        const h = this.height_per_rectangle;

        // Draw cell fill
        const colorString = ca.currentRule.getColor(state);
        this.ctx.fillStyle = colorString;
        this.ctx.fillRect(x, y, w, h);

      }
    }
  }

  updateBounds(newBounds: Bounds) {
    this.boundingRect = newBounds;
    this.width_per_rectangle = newBounds.width / this.width_count;
    this.height_per_rectangle = newBounds.height / this.height_count;
    
    // Update canvas pixel dimensions for the new size
    const dpr = window.devicePixelRatio || 1;
    const rect = this.canvasElement.getBoundingClientRect();
    
    // Only update if dimensions actually changed
    const newPixelWidth = rect.width * dpr;
    const newPixelHeight = rect.height * dpr;
    
    if (this.canvasElement.width !== newPixelWidth || this.canvasElement.height !== newPixelHeight) {
      this.canvasElement.width = newPixelWidth;
      this.canvasElement.height = newPixelHeight;
      
      // Reset context scale after canvas resize
      this.ctx.imageSmoothingEnabled = false;
      this.ctx.scale(dpr, dpr);
    }
  }
}

/**
 * Get canvas bounds using native DOM API
 */
function getCanvasBounds(canvasElement: HTMLCanvasElement): Bounds {
  const rect = canvasElement.getBoundingClientRect();
  return {
    left: 0,
    top: 0,
    width: rect.width,
    height: rect.height,
  };
}


//* AUTOMATA *//

export class CA {
  canvasSpace: CanvasSpace;
  cellSpace: CellSpace;
  currentRule: CARule;
  currentNeighborhoodType: NeighborhoodType;
  public caCount: number = caCount++;
  // Reusable state arrays to avoid allocations during iteration
  private stateBuffer1: number[];
  private stateBuffer2: number[];
  private currentStateBuffer: number[];
  private nextStateBuffer: number[];

  // Dirty-rect tracking for optimization
  private dirtyRects: Set<number> = new Set(); // Set of cell indices that changed

  constructor(
    num_rectangles_wide: number,
    num_rectangles_tall: number,
    boundingRect: Bounds,
    neighborhoodType?: NeighborhoodType,
    rule?: CARule,
    canvasElement?: HTMLCanvasElement
  ) {
    this.cellSpace = CellSpace.createCellSpaceWithStartingValues(DIMENSIONORDERS, initialConfig);
    const canvas = canvasElement || (document.getElementById("myCanvas") as HTMLCanvasElement);
    this.canvasSpace = new CanvasSpace(
      num_rectangles_tall,
      num_rectangles_wide,
      boundingRect,
      canvas
    );
    // Default to Moore neighborhood if not provided
    this.currentNeighborhoodType = neighborhoodType || NeighborhoodType.MOORE;
    // Default to Sand rule if not provided
    this.currentRule = rule || new SandRule();

    // Allocate state buffers once
    const bufferSize = this.cellSpace.cells.length;
    this.stateBuffer1 = new Array(bufferSize);
    this.stateBuffer2 = new Array(bufferSize);
    this.currentStateBuffer = this.stateBuffer1;
    this.nextStateBuffer = this.stateBuffer2;
  }

  public setNeighborhoodType(type: NeighborhoodType) {
    this.currentNeighborhoodType = type;
  }

  public setRule(rule: CARule) {
    // Only allow setting a rule if it matches the current neighborhood type
    if (rule.neighborhoodType === this.currentNeighborhoodType) {
      this.currentRule = rule;
    } else {
      console.error(
        `Cannot use ${rule.name} (${rule.neighborhoodType}) with ${this.currentNeighborhoodType} neighborhood`
      );
    }
  }

  public getNextState(index: number): number {
    const position = this.cellSpace.getPosition(index);
    const ret = this.currentRule.apply(this.cellSpace, position);
    if (getDebugConfig().getECAIterationDebug())
      console.log(`Computed next state for cell with rule ${this.currentRule.name} at index ${index} (position ${position}): ${ret}`);
    return ret;
  }


  /**
   * Get a cell at the given position.
   * @param position matrix-space (col, row) coordinate
   * @returns Cell at (position.0, position.1)
   */
  public getCell(position: Vector): Cell {
    return this.cellSpace.getCellAtIndex(this.cellSpace.getIndex(position));
  }

  /**
   * Paint a cell at the given position with the specified state.
   * Bypasses rule application and directly sets the cell state.
   */
  public scuffCell(position: Vector, state: number): void {
    if (!this.cellSpace.getPositionIsValid(position)) {
      console.warn(`Attempted to paint ${state} at invalid position ${position}, ignoring`);
      return; // Invalid position, do nothing
    }
    const index = this.cellSpace.getIndex(position);
    if (this.cellSpace.cells[index].state !== state) {
      // this.cellSpace.cells[index].state = state;
      this.cellSpace.cells[index] = new Cell(state);
      console.log(`Painted cell at position ${position} (index ${index}) with state ${state} \n
        Cell is now ${this.cellSpace.cells[index]}\n
        ${this.cellSpace.cells}`);
      this.markDirty(index);
    }
  }

  /**
   * Convert canvas coordinates to a cell grid position.
   * Accepts {x, y} coordinates in canvas space.
   * Returns null if the point is out of bounds.
   */
  public canvasPointToCellPosition(coords: { x: number; y: number }): Vector | null {
    const bounds = this.canvasSpace.boundingRect;

    // Check if point is within canvas bounds
    if (coords.x < bounds.left || coords.x >= bounds.left + bounds.width ||
      coords.y < bounds.top || coords.y >= bounds.top + bounds.height) {
      return null;
    }

    // Calculate relative position within the canvas
    const relativeX = coords.x - bounds.left;
    const relativeY = coords.y - bounds.top;

    // Convert to cell coordinates
    const cellX = Math.floor(relativeX / this.canvasSpace.width_per_rectangle);
    const cellY = Math.floor(relativeY / this.canvasSpace.height_per_rectangle);

    // Validate cell coordinates
    if (cellX < 0 || cellX >= this.canvasSpace.width_count ||
      cellY < 0 || cellY >= this.canvasSpace.height_count) {
      return null;
    }

    // Return as Vector (note: position format is [row, col] = [y, x] based on Cells.ts)
    return new Vector(cellY, cellX);
  }

  redraw() {
    const bounds = getCanvasBounds(this.canvasSpace.canvasElement);
    this.canvasSpace.updateBounds(bounds);
    this.canvasSpace.drawElements(this);
  }

  /**
   * Mark a cell as dirty (changed)
   */
  public markDirty(index: number): void {
    this.dirtyRects.add(index);
  }

  /**
   * Clear all dirty rects
   */
  public clearDirty(): void {
    this.dirtyRects.clear();
  }

  /**
   * Get set of dirty cell indices
   */
  public getDirtyRects(): Set<number> {
    return this.dirtyRects;
  }

  iterate() {
    this.currentStateBuffer = this.cellSpace.cells.map(cell => cell.state);
    // Compute next states into the next state buffer
    for (let i = 0; i < this.cellSpace.cells.length; i++) {
      this.nextStateBuffer[i] = this.getNextState(i);
    }
    // Update cells with computed states and track changes
    for (let i = 0; i < this.cellSpace.cells.length; i++) {
      if (this.cellSpace.cells[i].state !== this.nextStateBuffer[i]) {
        this.cellSpace.cells[i] = new Cell(this.nextStateBuffer[i]);
        // this.cellSpace.cells[i].state = this.nextStateBuffer[i];
        this.markDirty(i);
      }
    }
    // Swap buffers for next iteration (no allocation)
    const temp = this.currentStateBuffer;
    this.currentStateBuffer = this.nextStateBuffer;
    this.nextStateBuffer = temp;
    if (getDebugConfig().getECAIterationDebug()) {
      console.log(this.cellSpace.cells.map((cell) => cell.state));
      console.log(`Iterated`);
    }
  }


}
Cell.prototype.toString = function () {
  return this.state;
};

let initialConfig = [0, 0, 1, 1, 0, 0, 0, 0, 0, 0, 1, 1, 1, 1,];

var ca: CA;

// Rule registry organized by neighborhood type
const ruleRegistry = {
  [NeighborhoodType.ELEMENTARY]: {
    "rule110": new Rule110(),
  },
  [NeighborhoodType.MOORE]: {
    "sand": new SandRule(),
  },
};

/**
 * Get all available rules for a given neighborhood type
 */
function getRulesForNeighborhood(neighborhoodType: NeighborhoodType): { [key: string]: CARule } {
  return ruleRegistry[neighborhoodType] || {};
}

/**
 * Get all available neighborhood types
 */
export function getAvailableNeighborhoods(): Array<{ type: NeighborhoodType; label: string }> {
  return Object.values(NeighborhoodType).map(type => ({
    type,
    label: NEIGHBORHOOD_METADATA[type].label,
  }));
}

/**
 * Get all available rules for a neighborhood type, as key-label pairs
 */
export function getAvailableRulesForNeighborhood(neighborhoodType: NeighborhoodType): Array<{ key: string; label: string }> {
  const rules = getRulesForNeighborhood(neighborhoodType);
  return Object.entries(rules).map(([key, rule]) => ({
    key,
    label: rule.name,
  }));
}

/**
 * Get the current neighborhood type from the CA instance
 */
export function getCurrentNeighborhoodType(): NeighborhoodType {
  return ca.currentNeighborhoodType;
}

/**
 * Get the current rule's key from the CA instance
 */
export function getCurrentRuleName(): string {
  const currentRule = ca.currentRule;
  const rules = getRulesForNeighborhood(ca.currentNeighborhoodType);

  for (const [key, rule] of Object.entries(rules)) {
    if (rule.constructor === currentRule.constructor) {
      return key;
    }
  }

  // Fallback if no match found
  return Object.keys(rules)[0] || "";
}

/**
 * Get available states for a rule by its key
 */
export function getRuleAvailableStates(ruleKey: string): number[] {
  const currentNeighborhoodType = ca.currentNeighborhoodType;
  const rules = getRulesForNeighborhood(currentNeighborhoodType);
  const rule = rules[ruleKey];
  if (rule) {
    return rule.getAvailableStates();
  }
  return [];
}

/**
 * Get state label for a rule by its key
 */
export function getRuleStateLabel(ruleKey: string, state: number): string {
  const currentNeighborhoodType = ca.currentNeighborhoodType;
  const rules = getRulesForNeighborhood(currentNeighborhoodType);
  const rule = rules[ruleKey];
  if (rule) {
    return rule.getStateLabel(state);
  }
  return `State ${state}`;
}

export function entry(canvasElement: HTMLCanvasElement) {
  if (!canvasElement) {
    console.error("Canvas element not provided");
    return null;
  }

  const bounds = getCanvasBounds(canvasElement);
  ca = new CA(DIMENSIONORDERS[0], DIMENSIONORDERS[1], bounds, undefined, undefined, canvasElement);
  ca.redraw();

  // Start render loop with requestAnimationFrame
  startRenderLoop();

  return ca;
}

/**
 * Start the render loop using requestAnimationFrame
 * This decouples rendering from simulation for better performance
 */
function startRenderLoop() {
  function renderFrame() {
    if (!STOP) {
      // Render only if dirty rects exist or full redraw needed
      if (ca.getDirtyRects().size > 0) {
        ca.redraw();
        ca.clearDirty();
      }
    } else {
      // When stopped, still redraw if there are pending changes (e.g., from painting)
      if (ca.getDirtyRects().size > 0) {
        ca.redraw();
        ca.clearDirty();
      }
    }

    // Track framerate
    getDebugConfig().framerateMonitor.tick();

    // Schedule next frame
    renderLoopId = requestAnimationFrame(renderFrame);
  }

  renderLoopId = requestAnimationFrame(renderFrame);
}

//* EVENT HANDLERS *//

export function resizeEvent() {
  ca.redraw();
}

export function keypressEvent(event: KeyboardEvent) {
  switch (event.key) {
    case " ": {
      // Prevent spacebar from submitting forms when focused on buttons
      if (event.target instanceof HTMLButtonElement ||
        (event.target instanceof HTMLElement && event.target.tagName === 'INPUT' && (event.target as HTMLInputElement).type === 'submit')) {
        event.preventDefault();
      }
      tickAction();
      break;
    }
    default: {
      break;
    }
  }
}

function tickAction() {
  ca.iterate();
  getDebugConfig().tickrateMonitor.tick();
  // Note: rendering is now completely decoupled and happens in the requestAnimationFrame render loop
}

export function toggleTickLoop() {
  STOP = !STOP;
  console.log(`tickloop ${tickLoopIntervalId} : STOP ${STOP}`);
  if (STOP && tickLoopIntervalId) {
    clearInterval(tickLoopIntervalId);
    tickLoopIntervalId = null;
    getDebugConfig().tickrateMonitor.reset(); // Show 0 TPS when paused
  } else if (!STOP && TICKRATE) {
    const ts = 1000.0 / TICKRATE;
    tickLoopIntervalId = setInterval(tickAction, ts);
    console.log(`tickloop at ${TICKRATE} / every ${ts}ms`);
  }
}

export function setTickRate(newRate: number) {
  TICKRATE = newRate;
  getDebugConfig().tickrateMonitor.setTargetTickRate(STOP ? 0 : TICKRATE);
  if (tickLoopIntervalId) {
    clearInterval(tickLoopIntervalId);
    tickLoopIntervalId = null;
  }
  if (!STOP) {
    const ts = 1000.0 / TICKRATE;
    tickLoopIntervalId = setInterval(tickAction, ts);
  }
}

export function getTickRate(): number {
  return TICKRATE;
}

export function isRunning(): boolean {
  return !STOP;
}

export function getTickCount(): number {
  return getDebugConfig().tickrateMonitor.getTickCount();
}


export function submitDimensions(width: number, height: number, initialConfigStr: string, canvasElement: HTMLCanvasElement) {
  const prevNeighborhood = ca?.currentNeighborhoodType;
  const prevRule = ca?.currentRule;

  initialConfig = initialConfigStr.split(',').map(Number);
  DIMENSIONORDERS = [width, height];

  const bounds = getCanvasBounds(canvasElement);

  ca = new CA(
    width,
    height,
    bounds,
    prevNeighborhood,  // Preserve neighborhood
    prevRule           // Preserve rule
  );
  ca.redraw();
}

/**
 * Switch to a different neighborhood type
 */
export function switchNeighborhoodType(neighborhoodType: string) {
  const type = neighborhoodType as NeighborhoodType;
  if (Object.values(NeighborhoodType).includes(type)) {
    ca.setNeighborhoodType(type);
    // Auto-select first available rule for this neighborhood
    const rulesForNeighborhood = getRulesForNeighborhood(type);
    const firstRuleKey = Object.keys(rulesForNeighborhood)[0];
    if (firstRuleKey) {
      ca.setRule(rulesForNeighborhood[firstRuleKey]);
    }
    console.log(`Switched to neighborhood: ${type}`);
  } else {
    console.error(`Unknown neighborhood type: ${neighborhoodType}`);
  }
}

/**
 * Switch to a different rule (must be compatible with current neighborhood)
 */
export function switchRule(ruleKey: string) {
  const rulesForNeighborhood = getRulesForNeighborhood(ca.currentNeighborhoodType);
  const rule = rulesForNeighborhood[ruleKey];
  if (rule) {
    ca.setRule(rule);
    console.log(`Switched to rule: ${rule.name}`);
  } else {
    console.error(`Rule ${ruleKey} not found for neighborhood ${ca.currentNeighborhoodType}`);
  }
}

/**
 * Paint a cell at the given position with the specified state.
 * Exported wrapper for CA.paintCell()
 */
export function paintCell(position: Vector, state: number): void {
  if (ca) {
    ca.scuffCell(position, state);
  } else {
    console.error("CA instance not initialized");
  }
}

/**
 * Convert canvas coordinates to a cell grid position.
 * Exported wrapper for CA.canvasPointToCellPosition()
 */
export function canvasPointToCellPosition(coords: { x: number; y: number }): Vector | null {
  if (ca) {
    return ca.canvasPointToCellPosition(coords);
  }
  return null;
}
/**
 * Get the current CA instance for persistence operations
 */
export function getCurrentCA(): CA | null {
  return ca;
}

export function setCurrentCA(newCA: CA): void {
  ca = newCA;
  ca.redraw();
}

