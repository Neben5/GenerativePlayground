import * as paper from "paper";
import { Vector } from "@geometric/vector";
// expected step 1, 2:
// 11010000
// 11110001
const POSSIBLESTATES = 2;
//* CUSTOM ERRORS *//
class DimensionError extends Error {
  constructor(msg: string) {
    super(msg);

    // Set the prototype explicitly.
    Object.setPrototypeOf(this, DimensionError.prototype);
  }

  sayHello() {
    return "hello " + this.message;
  }
}
class IndexOutOfBoundsError extends Error {
  constructor(msg: string) {
    super(msg);

    // Set the prototype explicitly.
    Object.setPrototypeOf(this, DimensionError.prototype);
  }

  sayHello() {
    return "hello " + this.message;
  }
}

//* SPACE DEFINITIONS *//

class CellSpace {
  // representation of the state of cell-space at a point. Not a vector space!

  cells: Cell[];
  dimensionOrders: number[]; //space width, height, etc.
  cyclic: boolean[];

  constructor() {
    this.cells = [];
    this.dimensionOrders = [];
    this.cyclic = [];
  }

  public normalize(position: Vector): Vector {
    // TODO make dimension-independent
    if (position.length != this.dimensionOrders.length) {
      throw new DimensionError(
        "Dimensions of space and position do not align!"
      );
    }
    for (let i = 0; i < this.dimensionOrders.length; i++) {
      if (position[i] >= this.dimensionOrders[i] || position[i] < 0) {
        if (this.cyclic[i]) {
          position[i] =
            (position[i] + this.dimensionOrders[i]) % this.dimensionOrders[i];
        } else {
          throw new IndexOutOfBoundsError(
            `Cellspace dimension ${i} accessed at position ${position[i]}, which lies outside of dimension order ${this.dimensionOrders[i]}`
          );
        }
      }
    }

    return position;
  }
}
class CanvasSpace {
  elements: CanvasElement[];
  constructor(
    ca: CA,
    num_rectangles_tall: number,
    num_rectangles_wide: number,
    boundingRect: paper.Rectangle
  ) {
    this.elements = [];
    var width_per_rectangle = boundingRect.width / num_rectangles_wide;
    var height_per_rectangle = boundingRect.height / num_rectangles_tall;
    for (var i = 0; i < num_rectangles_wide; i++) {
      for (var j = 0; j < num_rectangles_tall; j++) {
        var position: Vector = ca.cellSpace.normalize(new Vector(i, j));
        var state = ca.getCell(position).state;
        var aRect = new paper.Path.Rectangle(
          new paper.Point(
            boundingRect.left + i * width_per_rectangle,
            boundingRect.top + j * height_per_rectangle
          ),
          new paper.Size(width_per_rectangle, height_per_rectangle)
        );
        var graphicsIndex = this.elements.push({
          graphicsObject: aRect,
          position: position,
        });

        aRect.strokeColor = new paper.Color("grey");
        aRect.fillColor = state
          ? new paper.Color("black")
          : new paper.Color("white");

        var oldGlobject = ca.getGlobject(position);
        var globject: Globject = {
          position: position,
          graphicsIndex: graphicsIndex,
          cellIndex: oldGlobject.cellIndex,
        };
        ca.globalObjectMap.set(CA.keyGen(position), globject);
      }
    }
  }
}

class Cell {
  state: number;
  // rect: paper.Path.Rectangle; //associated graphic element
  position: Vector; // associated vector designating location in cell space
  neighborhood: Vector[]; //keys for neighborhood globjects
  constructor(state: number, position: Vector) {
    this.state = state;
    // this.rect = rect;
    this.position = position;
  }
}
class CanvasElement {
  graphicsObject: paper.Path;
  position: Vector;
}

//* AUTOMATA *//

class Globject {
  position: Vector;
  graphicsIndex: number;
  cellIndex: number;
}

class CA {
  canvasSpace: CanvasSpace;
  cellSpace: CellSpace;
  globalObjectMap: Map<number, Globject>;
  ruleList: number[];
  constructor(
    num_rectangles_wide: number,
    num_rectangles_tall: number,
    boundingRect: paper.Rectangle,
    rule: number,
    neighborhoodMap: Vector[]
  ) {
    this.ruleList = this.initializeRules(rule, neighborhoodMap);
    this.cellSpace = initialConfig;
    this.initializeGlobspace();
    this.generateNeighborhoods(neighborhoodMap);
    this.canvasSpace = new CanvasSpace(
      this,
      num_rectangles_tall,
      num_rectangles_wide,
      boundingRect
    );
  }

  initializeRules(rule: number, neighborhoodMap: Vector[]): number[] {
    let ruleList: number[] = [];
    let neighborhoodStateSpaceSize = Math.pow(POSSIBLESTATES, neighborhoodMap.length);
    for(let i = neighborhoodStateSpaceSize; i > 0; i--) {
      ruleList[i] = rule % POSSIBLESTATES;
      rule /= POSSIBLESTATES;
    }
    console.log(ruleList);
    return ruleList;
  }

  initializeGlobspace() {
    this.globalObjectMap = new Map();
    this.cellSpace.cells.forEach((cell) => {
      this.globalObjectMap.set(CA.keyGen(cell.position), {
        cellIndex: this.cellSpace.cells.indexOf(cell),
        position: cell.position,
        graphicsIndex: -1,
      });
    });
  }

  generateNeighborhoods(neighborhoodMap: Vector[]) {
    this.cellSpace.cells.forEach((cell) => {
      for (let i = 0; i < neighborhoodMap.length; i++) {
        let vec = new Vector(0, 0);
        vec = vec.add(cell.position);
        vec = vec.add(neighborhoodMap[i]);
        // console.log(vec, cell.position, neighborhoodMap[i]);
        vec = this.cellSpace.normalize(vec);
        cell.neighborhood.push(vec);
      }
      console.log(cell.neighborhood);
    });
  }

  public getNextState(cell: Cell): number {
    //TODO make state dimension mutable

    let localStates: number[] = [];
    for (let i = 0; i < cell.neighborhood.length; i++) {
      console.log(cell.neighborhood[i]);
      console.log(CA.keyGen(cell.neighborhood[i]));
      console.log(ca.globalObjectMap);
      let a = this.getCell(cell.neighborhood[i]);
      console.log(a);
      localStates.push(a.state);
    }
    // make into getneighborhood, add rulematch
    let rule = 0;
    for (let i = 0; i < localStates.length; i++) {
      rule += Math.pow(POSSIBLESTATES, i) * localStates[i];
    }
    return this.ruleList[rule];
  }

  public getGlobject(position: Vector): Globject {
    let key = CA.keyGen(position);
    let globject = this.globalObjectMap.get(key);
    if (globject == undefined) {
      console.error(`position ${position} key ${key} not found in map`);
      console.error(this.globalObjectMap);
      throw new RangeError();
    }
    return globject;
  }

  public getCell(position: Vector): Cell {
    let key = CA.keyGen(position);
    let cellIndex = this.globalObjectMap.get(key).cellIndex;
    let retval = this.cellSpace.cells[cellIndex];
    if (retval == undefined) {
      console.error(`cellindex is ${cellIndex}`);
      console.error(`position ${position} key ${key} not found in map`);
      console.error(this.globalObjectMap);
      throw new RangeError();
    }
    return retval;
  }

  redraw() {
    // TODO
    console.error("Redraw not yet implemented");
  }

  iterate() {
    // TODO make dimension-agnostic
    var nextss = new CellSpace();
    nextss.cells = [];
    this.cellSpace.cells.forEach((cell) => {
      nextss.cells.push(new Cell(ca.getNextState(cell), cell.position));
    });
    this.cellSpace = nextss;
  }
  static keyGen(position: Vector): number {
    var result = position[0];
    position.forEach((element) => {
      // n-dimensional Cantor pairing function. See:
      // https://math.stackexchange.com/questions/23503/create-unique-number-from-2-numbers
      // https://math.stackexchange.com/questions/1377929/generalization-of-cantor-pairing-function-to-triples-and-n-tuples
      result = ((result + element) * (result + element + 1)) / 2 + element;
    });
    return result;
  }
}
Cell.prototype.toString = function () {
  return this.state;
};

// let initialConfig = [1, 1, 0, 1, 0, 0, 0, 0];
let initialConfig: CellSpace = {
  cells: [
    {
      state: 1,
      neighborhood: [],
      position: new Vector(0, 0),
    },
    {
      state: 1,
      neighborhood: [],
      position: new Vector(1, 0),
    },
    {
      state: 0,
      neighborhood: [],
      position: new Vector(2, 0),
    },
    {
      state: 1,
      neighborhood: [],
      position: new Vector(3, 0),
    },
    {
      state: 0,
      neighborhood: [],
      position: new Vector(4, 0),
    },
    {
      state: 0,
      neighborhood: [],
      position: new Vector(5, 0),
    },
    {
      state: 0,
      neighborhood: [],
      position: new Vector(6, 0),
    },
    {
      state: 0,
      neighborhood: [],
      position: new Vector(7, 0),
    },
  ],
  dimensionOrders: [8, 1],
  cyclic: [true, true],
  normalize: CellSpace.prototype.normalize,
};
var ca: CA;

export function entry() {
  // Not sure why this was necessary, but it was. Something to do with the way webpack handled linking the canvas to paper
  let nCells = 8;
  let rule = 110;
  let neighborhood = [new Vector(-1, 0), new Vector(0, 0), new Vector(1, 0)];
  paper.setup("myCanvas");
  ca = new CA(nCells, 1, paper.view.bounds, rule, neighborhood);
}

//* EVENT HANDLERS *//

export function resizeEvent(event: Event) {
  //TODO
  console.error("Resizing of grid not implemented");
  // paper.view.scrollBy(lastPoint.subtract(view.center));
  // Whenever the window is resized, recenter the path:
  // var delta = center.subtract(paper.view.center);
  // ca.canvasSpace.elements.forEach((object) => {
  //   object.position = object.position.add(delta);
  // });
  // path.position = paper.view.center;
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
