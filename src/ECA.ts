import * as paper from "paper";
import { Vector } from "@geometric/vector";
import { CellSpace, Cell, states } from "./Cells";

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
  constructor(
    num_rectangles_wide: number,
    num_rectangles_tall: number,
    boundingRect: paper.Rectangle,
  ) {
    this.cellSpace = CellSpace.createCellSpaceWithStartingValues(DIMENSIONORDERS, initialConfig);
    this.canvasSpace = new CanvasSpace(
      num_rectangles_tall,
      num_rectangles_wide,
      boundingRect
    );
  }


  public getNextState(index: number): number {
    let neighborhood = this.cellSpace.getNeighborhood(index);
    return this.applyRule(neighborhood);
  }

  public elemRule(neighborhood: Cell[]): number {
    let left = neighborhood[0].state;
    let center = neighborhood[1].state;
    let right = neighborhood[2].state;
    if (left && center && right) {
      return 0;
    } else if (left && !center && !right) {
      return 0;
    } else if (!left && !center && !right) {
      return 0;
    } else {
      return 1;
    }

  }

  public sandRule(neighborhood: Cell[]): number {
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

  public applyRule(neighborhood: Cell[]): number {
    return this.sandRule(neighborhood);
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
