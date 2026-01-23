import * as paper from "paper";
import { Vector } from "@geometric/vector";
import { CellSpace, Cell } from "./Cells";
import { CARule, NeighborhoodType, NEIGHBORHOOD_METADATA } from "./CARule";
import { Rule110 } from "./Rule110";
import { SandRule } from "./SandRule";

var POSSIBLESTATES = 2;
var DIMENSIONORDERS = [8, 2];
var TICKRATE = 60;
var STOP = true;

var tickLoopIntervalId: NodeJS.Timeout = null;

class CanvasSpace {
  boundingRect: paper.Rectangle;
  height_count: number;
  width_count: number;
  width_per_rectangle: number;
  height_per_rectangle: number;
  constructor(
    height: number,
    width: number,
    boundingRect: paper.Rectangle
  ) {
    console.log(`CanvasSpace{height: ${height}, width: ${width}, boundingRect: ${boundingRect}}`);
    this.boundingRect = boundingRect;
    this.height_count = height;
    this.width_count = width;
    this.width_per_rectangle = boundingRect.width / this.width_count;
    this.height_per_rectangle = boundingRect.height / this.height_count;
  }


  drawElements(ca: CA) {
    paper.project.activeLayer.removeChildren();
    for (var j = 0; j < this.width_count; j++) {
      for (var i = 0; i < this.height_count; i++) {
        var position = new Vector(i, j);
        var idx = ca.cellSpace.getIndex(position);
        var state = ca.getCell(position).state;
        var point = new paper.Point(
          this.boundingRect.left + j * this.width_per_rectangle,
          this.boundingRect.top + i * this.height_per_rectangle
        );
        var size = new paper.Size(this.width_per_rectangle, this.height_per_rectangle);
        var aRect = new paper.Path.Rectangle(
          point,
          size
        );
        aRect.strokeColor = new paper.Color("grey");
        // Use the rule's getColor method to determine the display color
        const colorString = ca.currentRule.getColor(state);
        aRect.fillColor = new paper.Color(colorString);
      }
    }
    paper.project.activeLayer.fitBounds(paper.view.bounds);
  }

  updateBounds(newBounds: paper.Rectangle) {
    this.boundingRect = newBounds;
    this.width_per_rectangle = newBounds.width / this.width_count;
    this.height_per_rectangle = newBounds.height / this.height_count;
  }
}


//* AUTOMATA *//

class CA {
  canvasSpace: CanvasSpace;
  cellSpace: CellSpace;
  currentRule: CARule;
  currentNeighborhoodType: NeighborhoodType;

  // Reusable state arrays to avoid allocations during iteration
  private stateBuffer1: number[];
  private stateBuffer2: number[];
  private currentStateBuffer: number[];
  private nextStateBuffer: number[];
  debug = {
    iteration: false,
  };
  constructor(
    num_rectangles_wide: number,
    num_rectangles_tall: number,
    boundingRect: paper.Rectangle,
    neighborhoodType?: NeighborhoodType,
    rule?: CARule
  ) {
    this.cellSpace = CellSpace.createCellSpaceWithStartingValues(DIMENSIONORDERS, initialConfig);
    this.canvasSpace = new CanvasSpace(
      num_rectangles_tall,
      num_rectangles_wide,
      boundingRect
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

    // Initialize cached neighborhood array with correct size
    this.resizeCachedNeighborhood(this.currentNeighborhoodType);
  }

  public setNeighborhoodType(type: NeighborhoodType) {
    this.currentNeighborhoodType = type;
    this.resizeCachedNeighborhood(type);
    console.log(`Switched to neighborhood: ${type}`);
  }

  /**
   * Resize the cached neighborhood array based on neighborhood type
   */
  private resizeCachedNeighborhood(neighborhoodType: NeighborhoodType) {
    const requiredSize = NEIGHBORHOOD_METADATA[neighborhoodType].neighborhoodSize;
  }

  public setRule(rule: CARule) {
    // Only allow setting a rule if it matches the current neighborhood type
    if (rule.neighborhoodType === this.currentNeighborhoodType) {
      this.currentRule = rule;
      console.log(`Switched to rule: ${rule.name}`);
    } else {
      console.error(
        `Cannot use ${rule.name} (${rule.neighborhoodType}) with ${this.currentNeighborhoodType} neighborhood`
      );
    }
  }

  public getNextState(index: number): number {
    const position = this.cellSpace.getPosition(index);
    const ret = this.currentRule.apply(this.cellSpace, position);
    if (this.debug.iteration)
      console.log(`Computed next state for cell with rule ${this.currentRule.name} at index ${index} (position ${position}): ${ret}`);
    return ret;
  }


  public getCell(position: Vector): Cell {
    return this.cellSpace.getCellAtIndex(this.cellSpace.getIndex(position));
  }

  /**
   * Paint a cell at the given position with the specified state.
   * Bypasses rule application and directly sets the cell state.
   */
  public paintCell(position: Vector, state: number): void {
    if (!this.cellSpace.getPositionIsValid(position)) {
      return; // Invalid position, do nothing
    }
    const index = this.cellSpace.getIndex(position);
    this.cellSpace.cells[index].state = state;
    this.redraw();
  }

  /**
   * Convert a Paper.js point (canvas coordinates) to a cell grid position.
   * Returns null if the point is out of bounds.
   */
  public canvasPointToCellPosition(point: paper.Point): Vector | null {
    const bounds = this.canvasSpace.boundingRect;
    
    // Check if point is within canvas bounds
    if (point.x < bounds.left || point.x >= bounds.right ||
        point.y < bounds.top || point.y >= bounds.bottom) {
      return null;
    }

    // Calculate relative position within the canvas
    const relativeX = point.x - bounds.left;
    const relativeY = point.y - bounds.top;

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
    this.canvasSpace.updateBounds(paper.view.bounds);
    this.canvasSpace.drawElements(this);
  }

  iterate() {
    // Compute next states into the next state buffer
    for (let i = 0; i < this.cellSpace.cells.length; i++) {
      this.nextStateBuffer[i] = this.getNextState(i);
    }
    // Update cells with computed states
    for (let i = 0; i < this.cellSpace.cells.length; i++) {
      this.cellSpace.cells[i].state = this.nextStateBuffer[i];
    }
    // Swap buffers for next iteration (no allocation)
    const temp = this.currentStateBuffer;
    this.currentStateBuffer = this.nextStateBuffer;
    this.nextStateBuffer = temp;
    console.log(this.cellSpace.cells.map((cell) => cell.state));
    console.log(`Iterated`);
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

export function entry() {
  // Not sure why this was necessary, but it was. Something to do with the way webpack handled linking the canvas to paper
  paper.setup("myCanvas");
  ca = new CA(DIMENSIONORDERS[0], DIMENSIONORDERS[1], paper.view.bounds);
  ca.redraw();

  // Initialize stop button state to match STOP variable
  updateStopButtonState();
  return ca;
}

//* EVENT HANDLERS *//

export function resizeEvent(event: Event) {
  ca.redraw();
}

export function keypressEvent(event: KeyboardEvent) {
  switch (event.key) {
    case " ": {
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
  ca.redraw();
}

export function toggleTickLoop() {
  STOP = !STOP;
  console.log(`tickloop ${tickLoopIntervalId} : STOP ${STOP}`);
  if (STOP && tickLoopIntervalId) {
    clearInterval(tickLoopIntervalId);
    tickLoopIntervalId = null;
  } else if (!STOP && TICKRATE) {
    const ts = 1000.0 / TICKRATE;
    tickLoopIntervalId = setInterval(tickAction, ts);
    console.log(`tickloop at ${TICKRATE} / every ${ts}ms`);
  }
  // Sync checkbox state with actual state
  updateStopButtonState();
}

/**
 * Update the stop button checkbox to match the current state
 */
function updateStopButtonState() {
  const stopButton = document.getElementById("stopButton") as HTMLInputElement;
  if (stopButton) {
    stopButton.checked = STOP;
  }
}

export function triggerTickRateChange() {
  var tickrate = parseInt((document.getElementById('tickRate') as HTMLInputElement).value);
  TICKRATE = tickrate;

  if (tickLoopIntervalId) {
    clearInterval(tickLoopIntervalId);
    tickLoopIntervalId = null;
  }
  if (!STOP) {
    const ts = 1000.0 / TICKRATE;
    tickLoopIntervalId = setInterval(tickAction, ts);
  }
}


export function submitEvent(event: Event) {
  event.preventDefault(); // Prevents the default page refresh
  // Handle form data with JavaScript
  var height = parseInt((document.getElementById('height') as HTMLInputElement).value);
  var width = parseInt((document.getElementById('width') as HTMLInputElement).value);

  DIMENSIONORDERS = [width, height];
  ca = new CA(
    width,
    height,
    paper.view.bounds
  );
  initialConfig = (document.getElementById('initialConfig') as HTMLInputElement).value.split(',').map(Number);
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
      // Update UI to reflect the rule change
      const ruleSelect = document.getElementById('ruleSelect') as HTMLSelectElement;
      if (ruleSelect) {
        ruleSelect.value = firstRuleKey;
      }
    }
    updateRuleOptions(type);
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
 * Update the rule dropdown based on the selected neighborhood type
 */
export function updateRuleOptions(neighborhoodType: NeighborhoodType) {
  const rulesForNeighborhood = getRulesForNeighborhood(neighborhoodType);
  const ruleSelect = document.getElementById('ruleSelect') as HTMLSelectElement;

  if (!ruleSelect) return;

  // Clear existing options
  ruleSelect.innerHTML = '';

  // Add new options
  for (const [key, rule] of Object.entries(rulesForNeighborhood)) {
    const option = document.createElement('option');
    option.value = key;
    option.textContent = rule.name;
    ruleSelect.appendChild(option);
  }
}

/**
 * Paint a cell at the given position with the specified state.
 * Exported wrapper for CA.paintCell()
 */
export function paintCell(position: Vector, state: number): void {
  if (ca) {
    ca.paintCell(position, state);
  }
}

/**
 * Convert a Paper.js point to a cell grid position.
 * Exported wrapper for CA.canvasPointToCellPosition()
 */
export function canvasPointToCellPosition(point: paper.Point): Vector | null {
  if (ca) {
    return ca.canvasPointToCellPosition(point);
  }
  return null;
}
