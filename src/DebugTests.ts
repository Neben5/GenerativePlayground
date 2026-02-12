import * as eca from "./ECA";
import type { Position2D } from "./Cells";

type DebugTestResult = {
    name: string;
    pass: boolean;
    details?: string;
};

function getTestPositions(): Position2D[] {
    const ca = eca.getCurrentCA();
    if (!ca) {
        return [];
    }
    const maxRow = Math.max(0, ca.canvasSpace.height_count - 1);
    const maxCol = Math.max(0, ca.canvasSpace.width_count - 1);
    const midRow = Math.floor(maxRow / 2);
    const midCol = Math.floor(maxCol / 2);

    return [
        [0, 0],
        [0, maxCol],
        [maxRow, 0],
        [maxRow, maxCol],
        [midRow, midCol],
    ];
}

function getTestState(): number {
    const ca = eca.getCurrentCA();
    if (!ca) {
        return 1;
    }
    const states = ca.currentRule.getAvailableStates();
    if (!states || states.length === 0) {
        return 1;
    }
    return states[states.length - 1];
}

function sampleCellColor(position: Position2D): string | null {
    const ca = eca.getCurrentCA();
    if (!ca) {
        return null;
    }
    const bounds = ca.canvasSpace.boundingRect;

    const w = ca.canvasSpace.width_per_rectangle;
    const h = ca.canvasSpace.height_per_rectangle;
    const x = bounds.left + position[1] * w + w * 0.5;
    const y = bounds.top + position[0] * h + h * 0.5;
    const dpr = window.devicePixelRatio || 1;

    const px = Math.max(0, Math.min(ca.canvasSpace.canvasElement.width - 1, Math.floor(x * dpr)));
    const py = Math.max(0, Math.min(ca.canvasSpace.canvasElement.height - 1, Math.floor(y * dpr)));
    const data = ca.canvasSpace.ctx.getImageData(px, py, 1, 1).data;
    return `rgba(${data[0]}, ${data[1]}, ${data[2]}, ${data[3]})`;
}

export function debugCompareCheapVsFull(position: Position2D, state: number): {
    match: boolean;
    fullColor: string | null;
    cheapColor: string | null;
} {
    const ca = eca.getCurrentCA();
    if (!ca) {
        console.error("CA instance not initialized");
        return { match: false, fullColor: null, cheapColor: null };
    }

    console.log(`Initial color at position ${position}: ${sampleCellColor(position)}`);

    ca.clearDirty();
    ca.scuffCell(position, state);
    ca.redraw();
    const fullColor = sampleCellColor(position);

    ca.scuffCell(position, state);
    ca.cheapRedraw();
    const cheapColor = sampleCellColor(position);
    ca.clearDirty();
    ca.redraw();
    const match = fullColor === cheapColor;
    console.log("cheap vs full", { position, state, match, fullColor, cheapColor });
    return { match, fullColor, cheapColor };
}

export function runDebugTestSuite(): DebugTestResult[] {
    const ca = eca.getCurrentCA();
    if (!ca) {
        const result = [{
            name: "CA initialized",
            pass: false,
            details: "CA instance not initialized",
        }];
        console.warn("Debug test suite", result);
        return result;
    }

    const results: DebugTestResult[] = [];
    const state = getTestState();
    const positions = getTestPositions();

    for (const position of positions) {
        const { match, fullColor, cheapColor } = debugCompareCheapVsFull(position, state);
        const label = `cheap vs full at (${position[0]}, ${position[1]})`;
        if (!match) {
            results.push({
                name: label,
                pass: false,
                details: `full=${fullColor} cheap=${cheapColor}`,
            });
        } else {
            results.push({ name: label, pass: true });
        }
    }

    console.log("Debug test suite results", results);
    return results;
}
