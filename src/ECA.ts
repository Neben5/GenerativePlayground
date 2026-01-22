import * as paper from "paper";
import { Vector } from "@geometric/vector";
import { CellSpace, Cell, states } from "./Cells";

var POSSIBLESTATES = 2;
var DIMENSIONORDERS = [8, 2];
var TICKRATE = 60;
var STOP = true;

var tickLoopIntervalId: NodeJS.Timeout = null;

//* NEIGHBORHOOD AND RULE SYSTEM *//

/**
 * Types of neighborhoods available in the system
 */
enum NeighborhoodType {
  ELEMENTARY = "elementary",  // 1D: left, center, right
  MOORE = "moore",            // 2D: 3x3 square
}

/**
 * Metadata for neighborhoods: labels and descriptions
 */
const NEIGHBORHOOD_METADATA: {[key in NeighborhoodType]: {label: string; description: string}} = {
  [NeighborhoodType.MOORE]: {
    label: "Moore (3×3)",
    description: "2D neighborhood with 8 adjacent cells in a square pattern",
  },
  [NeighborhoodType.ELEMENTARY]: {
    label: "Elementary (1D)",
    description: "1D neighborhood with left and right neighbors",
  },
};

/**
 * Abstract base class for cellular automata rules.
 * Each rule is associated with a specific neighborhood type.
 */
abstract class CARule {
  abstract name: string;
  abstract neighborhoodType: NeighborhoodType;
  /**
   * Apply the rule to a neighborhood and return the next state
   */
  abstract apply(neighborhood: Cell[]): number;
}

/**
 * Wolfram's Rule 110 - Elementary CA
 * Works with 1D neighborhoods (left, center, right)
 */
class Rule110 extends CARule {
  name = "Rule 110";
  neighborhoodType = NeighborhoodType.ELEMENTARY;

  apply(neighborhood: Cell[]): number {
    const left = neighborhood[0].state;
    const center = neighborhood[1].state;
    const right = neighborhood[2].state;
    
    // Wolfram Rule 110 lookup table
    const pattern = (left << 2) | (center << 1) | right;
    const lut = [0, 1, 1, 1, 0, 1, 1, 0]; // Rule 110 in binary: 01101110
    return lut[pattern];
  }
}

/**
 * Sand physics rule - works with 3x3 Moore neighborhoods
 */
class SandRule extends CARule {
  name = "Sand Physics";
  neighborhoodType = NeighborhoodType.MOORE;

  apply(neighborhood: Cell[]): number {
    const upLeft = neighborhood[0].state;
    const up = neighborhood[1].state;
    const upRight = neighborhood[2].state;
    const left = neighborhood[3].state;
    const self = neighborhood[4].state;
    const right = neighborhood[5].state;
    const downLeft = neighborhood[6].state;
    const down = neighborhood[7].state;
    const downRight = neighborhood[8].state;

    switch (self) {
      case states.EMPTY:
        if (up == states.SAND) {
          return states.SAND;
        }
        if (upRight == states.SAND && right != states.EMPTY && up == states.EMPTY) {
          return states.SAND;
        }
        if (left == states.COMPACTED_SAND && upLeft == states.SAND && downLeft != states.EMPTY) {
          return states.SAND;
        }
        return states.EMPTY;
      case states.SAND:
        if (down == states.EMPTY) {
          return states.EMPTY;
        }
        if (downLeft == states.EMPTY && left == states.EMPTY) {
          return states.EMPTY;
        }
        if (down && (up == states.SAND || up == states.COMPACTED_SAND)) {
          return states.COMPACTED_SAND;
        }
        if (down == states.COMPACTED_SAND && right == states.EMPTY && downRight == states.EMPTY) {
          return states.EMPTY;
        }
        return states.SAND;
      case states.COMPACTED_SAND:
        if (down == states.EMPTY) {
          return states.SAND;
        }
        if (down == states.SAND) {
          return states.SAND;
        }
        if (up == states.EMPTY || up == states.ROCK) {
          return states.SAND;
        }
        return states.COMPACTED_SAND;
      case states.ROCK:
        return states.ROCK;
    }
  }
}

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
        const fillColor = (() => {
          switch (state) {
            case states.EMPTY: return new paper.Color("white");
            case states.SAND: return new paper.Color("#f5c264");
            case states.COMPACTED_SAND: return new paper.Color("#bc7b3aff");
            case states.ROCK: return new paper.Color("grey");
            default: return new paper.Color("black");
          }
        })();
        aRect.fillColor = fillColor;
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
  }

  public setNeighborhoodType(type: NeighborhoodType) {
    this.currentNeighborhoodType = type;
    console.log(`Switched to neighborhood: ${type}`);
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
    let neighborhood: Cell[];
    
    if (this.currentNeighborhoodType === NeighborhoodType.ELEMENTARY) {
      neighborhood = this.cellSpace.elementaryNeighborhood(this.cellSpace.getPosition(index));
    } else {
      neighborhood = this.cellSpace.threesquareNeighborhood(this.cellSpace.getPosition(index));
    }
    
    return this.currentRule.apply(neighborhood);
  }



  public getCell(position: Vector): Cell {
    return this.cellSpace.getCellAtIndex(this.cellSpace.getIndex(position));
  }

  redraw() {
    this.canvasSpace.updateBounds(paper.view.bounds);
    this.canvasSpace.drawElements(this);
  }

  iterate() {
    // TODO make dimension-agnostic
    var nextss = new CellSpace(DIMENSIONORDERS, new Array(this.cellSpace.cells.length).fill(new Cell(0)));
    for (let i: number = 0; i < this.cellSpace.cells.length; i++) {
      nextss.cells[i] = new Cell(this.getNextState(i));
    };
    this.cellSpace = nextss;
    console.log(`Iterated to next state: ${this.cellSpace.cells}`);
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
function getRulesForNeighborhood(neighborhoodType: NeighborhoodType): {[key: string]: CARule} {
  return ruleRegistry[neighborhoodType] || {};
}

/**
 * Get all available neighborhood types
 */
export function getAvailableNeighborhoods(): Array<{type: NeighborhoodType; label: string}> {
  return Object.values(NeighborhoodType).map(type => ({
    type,
    label: NEIGHBORHOOD_METADATA[type].label,
  }));
}

/**
 * Get all available rules for a neighborhood type, as key-label pairs
 */
export function getAvailableRulesForNeighborhood(neighborhoodType: NeighborhoodType): Array<{key: string; label: string}> {
  const rules = getRulesForNeighborhood(neighborhoodType);
  return Object.entries(rules).map(([key, rule]) => ({
    key,
    label: rule.name,
  }));
}

export function entry() {
  // Not sure why this was necessary, but it was. Something to do with the way webpack handled linking the canvas to paper
  paper.setup("myCanvas");
  ca = new CA(DIMENSIONORDERS[0], DIMENSIONORDERS[1], paper.view.bounds);
  ca.redraw();
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
