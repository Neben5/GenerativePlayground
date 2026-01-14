import * as paper from "paper";
import { Vector } from "@geometric/vector";
import { CellSpace, Cell } from "./Cells";

var POSSIBLESTATES = 2;
var DIMENSIONORDERS = [8, 2];
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
        aRect.fillColor = state ? new paper.Color("brown") : new paper.Color("white");
      }
    }
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
    const up = neighborhood[5].state;
    const self = neighborhood[4].state;
    const down = neighborhood[3].state;
    // const downLeft = neighborhood[0].state;
    // const downRight = neighborhood[2].state;
    if (up && !self) {
      return up;
    } else if (self && !down) {
      return 0;
    }
    return self;
  }

  public applyRule(neighborhood: Cell[]): number {
    return this.elemRule(neighborhood);

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

let initialConfig = [1, 1, 0, 1, 0, 1, 0, 1, 2, 2, 2, 2, 2, 2, 2, 2];

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
      ca.iterate();
      ca.redraw();
      break;
    }
    default: {
      break;
    }
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
