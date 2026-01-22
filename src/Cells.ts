import * as paper from "paper";
import { Vector } from "@geometric/vector";

export enum states {
  EMPTY = 0,
  SAND = 1,
  COMPACTED_SAND = 2,
  ROCK = -1,
}
export class CellSpace {


    // representation of the state of cell-space at a point. Not a vector space!
    // cells represent a matrix
    cells: Cell[];
    // ( ..11  ..12  ..13  ... ..1n)
    // ( ..21  ..22  ..23  ... ..2n)
    // ...
    // ( ..m1  ..m2  ..m3  ... ..mn)
    //  where n = dimensionOrders[0], m = dimensionOrders[1], etc.
    // so, index of cell at position (p1, p2, ..., pn) is:
    // index = p1 * (n2*n3*...*nn) + p2 * (n3*n4*...*nn) + ... + pn
    indexOrders: number[];
    dimensionOrders: number[];

    /**
     * 
     * @param dimensionOrders dimension orders in decreasing value. last will have element 0 at cells[0]
     * @param startingValues 
     */
    static createCellSpaceWithStartingValues(dimensionOrders: number[], startingValues: number[]) {
        console.log(`CellSpace{dimensionOrders: ${dimensionOrders}, startingValues: ${startingValues}}`);
        let cells = startingValues.map((value) => new Cell(value));
        return new CellSpace(dimensionOrders, cells);
    }

    constructor(dimensionOrders: number[], cells: Cell[]) {
        var ncells = 1;
        for (let dimension_idx = 0; dimension_idx < dimensionOrders.length; dimension_idx++) {
            ncells *= dimensionOrders[dimension_idx];
        }
        this.cells = new Array<Cell>(ncells).fill(new Cell(0));
        this.dimensionOrders = dimensionOrders;
        this.indexOrders = new Array<number>(dimensionOrders.length);
        let indexOrder = 1;
        for (let dimensionIndex = 0; dimensionIndex < dimensionOrders.length; dimensionIndex++) {
            this.indexOrders[dimensionIndex] = indexOrder;
            indexOrder *= dimensionOrders[dimensionIndex];
        }
        for (let i = 0; i < this.cells.length; i++) {
            this.cells[i] = cells[i] ?? new Cell(0);
        }
        console.log(`Initialized CellSpace with dimensionOrders ${dimensionOrders} and indexOrders ${this.indexOrders} to initial value ${this.cells.map((cell) => cell.state)}`);
    }


    /**
     * Get the array index for a given position in the matrix cell space
     * @param position matrix format (i,j) = (col, row) position
     * @returns array index
     */
    getIndex(position: Vector): number {
        if (position.length != this.dimensionOrders.length) {
            throw new DimensionError(
                `Position dimension ${position.length} does not match cell space dimension ${this.dimensionOrders.length}`
            );
        }
        let index = 0;
        // matrix index (y (col), x (row)) -> array index i * nrows + j
        for (let dim = 0; dim < position.length; dim++) {
            index += position[dim] * this.indexOrders[position.length - 1 - dim];
        }
        // console.debug(`Got index ${index} for position ${position}`);
        return index
    }

    getPosition(index: number): Vector {
        let position = new Vector(this.dimensionOrders.length);
        let indexRemaining = index;
        for (let dim = position.length - 1; dim >= 0; dim--) {
            position[position.length - 1 - dim] = Math.floor(indexRemaining / this.indexOrders[dim]);
            indexRemaining %= this.indexOrders[dim];
        }
        // console.debug(`Got position ${position} for index ${index}`);
        return position;
    }

    /**
     * 
     * @param index 
     * @throws {@link IndexOutOfBoundsError}
     */
    getCellAtIndex(index: number): Cell {
        if (index < 0 || index >= this.cells.length) {
            throw new IndexOutOfBoundsError(
                `Index ${index} is out of bounds for cell space of size ${this.cells.length}`
            );
        }
        return this.cells[index];
    }

    getPositionIsValid(position: Vector): boolean {
        if (position.length != this.dimensionOrders.length) {
            return false;
        }
        for (let dim = 0; dim < position.length; dim++) {
            if (position[dim] < 0 || position[dim] >= this.dimensionOrders[position.length - 1 - dim]) {
                return false;
            }
        }
        return true;
    }

    /**
     * Get the elementary neighborhood of a position. For 1D, this is the cell itself and its left and right neighbors. 
     * For higher dimensions, this is the cell itself and its neighbors in each dimension.
     * @param position 
     * @returns 
     */
    elementaryNeighborhood(position: Vector, outputArray?: Cell[]): Cell[] {
        const neighborhood = outputArray || new Array(3);
        const offsets = [-1, 0, 1];
        for (let i = 0; i < 3; i++) {
            const offset = offsets[i];
            const neighborPos = position[1] + offset;
            if (neighborPos < 0 || neighborPos >= this.dimensionOrders[1]) {
                neighborhood[i] = this.getCellAtIndex(this.getIndex(position));
            } else {
                const idx = position[0] * this.indexOrders[1] + neighborPos;
                neighborhood[i] = this.cells[idx];
            }
        }
        return neighborhood;
    }

    threesquareNeighborhood(position: Vector, outputArray?: Cell[]): Cell[] {
        const neighborhood = outputArray || new Array(9);
        const offsets = [[-1, -1], [-1, 0], [-1, 1], [0, -1], [0, 0], [0, 1], [1, -1], [1, 0], [1, 1]];
        const x = position[0];
        const y = position[1];
        let idx = 0;
        for (const offset of offsets) {
            const nx = x + offset[0];
            const ny = y + offset[1];
            if (nx < 0 || nx >= this.dimensionOrders[0] || ny < 0 || ny >= this.dimensionOrders[1]) {
                neighborhood[idx] = this.cells[this.getIndex(position)];
            } else {
                const cellIdx = nx * this.indexOrders[1] + ny;
                neighborhood[idx] = this.cells[cellIdx];
            }
            idx++;
        }
        return neighborhood;
    }

    getNeighborhood(index: number): Cell[] {
        return this.threesquareNeighborhood(this.getPosition(index));
    }

}

export class Cell {
    // singular dimension state
    state: number;
    constructor(state: number) {
        this.state = state;
    }
}
export class DimensionError extends Error {
    constructor(msg: string) {
        super(msg);

        // Set the prototype explicitly.
        Object.setPrototypeOf(this, DimensionError.prototype);
    }

    sayHello() {
        return "hello " + this.message;
    }
}
export class IndexOutOfBoundsError extends Error {
    constructor(msg: string) {
        super(msg);

        // Set the prototype explicitly.
        Object.setPrototypeOf(this, DimensionError.prototype);
    }

    sayHello() {
        return "hello " + this.message;
    }
}
