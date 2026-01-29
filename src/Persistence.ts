/**
 * Persistence Module - Handles serialization/deserialization of CA presets and full states
 * Presets: Lightweight configurations (rule, neighborhood, dimensions, optional initial pattern) stored in localStorage
 * Full States: Complete CA snapshots (cells, rule, neighborhood, dimensions, tick count, timestamp) saved as JSON files
 */

import { CARule, NEIGHBORHOOD_METADATA, NeighborhoodType } from "./CARule";
import { CA } from "./ECA";
import { Rule110 } from "./Rule110";
import { SandRule } from "./SandRule";

/**
 * Preset: Serializable CA configuration for quick save/load
 */
export interface Preset {
    name: string;
    neighborhood: string;
    rule: string; // Rule key
    width: number;
    height: number;
    initialPattern: number[]; // Optional initial cell states
    createdAt: number;
}

/**
 * FullState: Complete CA state including all cells and metadata
 */
export interface FullState {
    name: string;
    neighborhood: string;
    rule: string;
    width: number;
    height: number;
    cells: number[];
    tickCount: number;
    timestamp: number;
}

const PRESET_STORAGE_KEY = "ca_presets";
const DEFAULT_PRESETS: Preset[] = [
    {
        name: "Rule 110 Classic",
        neighborhood: NeighborhoodType.ELEMENTARY.toString(),
        rule: Rule110.RuleName,
        width: 10,
        height: 2,
        initialPattern: [0, 0, 0, 0, 1, 0, 0, 0, 0, 0],
        createdAt: Date.now(),
    },
    {
        name: "Sand Chaos",
        neighborhood: NeighborhoodType.MOORE.toString(),
        rule: SandRule.RuleName,
        width: 20,
        height: 20,
        initialPattern: [ 1,  1,  1,  0,  0,  1,  1,  1,  0,  0,  1,  1,  1,  0,  0,  1,  1,  1,  0,  0,
                          1,  1,  1,  0,  0,  1, -1,  1,  0,  0,  1,  1,  1,  0,  0,  1, -1,  1,  0,  0,
                          0,  0,  0,  0,  0,  0,  0,  0,  0,  0,  0,  0,  0,  0,  0,  0,  0,  0,  0,  0,
                         -1, -1,  1,  0,  0,  1,  1,  1,  0,  0,  1,  1,  1,  0,  0,  1,  1,  1,  0,  0,
                          1,  1,  1,  0,  0,  1,  1,  1,  0,  0, -1, -1, -1,  0,  0,  1,  1,  1,  0,  0],
        createdAt: Date.now(),
    },
];

/**
 * Initialize localStorage with default presets if not already present
 */
export function initializePresets(): void {
    const existing = localStorage.getItem(PRESET_STORAGE_KEY);
    if (!existing) {
        localStorage.setItem(PRESET_STORAGE_KEY, JSON.stringify(DEFAULT_PRESETS));
    }
}

/**
 * Get all saved presets from localStorage
 */
export function getAllPresets(): Preset[] {
    const data = localStorage.getItem(PRESET_STORAGE_KEY);
    if (!data) {
        return DEFAULT_PRESETS;
    }
    try {
        return JSON.parse(data);
    } catch (e) {
        console.error("Failed to parse presets from localStorage:", e);
        return DEFAULT_PRESETS;
    }
}

/**
 * Save a preset to localStorage
 */
export function savePreset(preset: Preset): void {
    const presets = getAllPresets();
    // Remove preset with same name if exists
    const filtered = presets.filter((p) => p.name !== preset.name);
    filtered.push(preset);
    localStorage.setItem(PRESET_STORAGE_KEY, JSON.stringify(filtered));
}

/**
 * Delete a preset by name
 */
export function deletePreset(name: string): void {
    const presets = getAllPresets();
    const filtered = presets.filter((p) => p.name !== name);
    localStorage.setItem(PRESET_STORAGE_KEY, JSON.stringify(filtered));
}

/**
 * Get a preset by name
 */
export function getPreset(name: string): Preset | null {
    const presets = getAllPresets();
    console.log("Available presets:", presets);
    return presets.find((p) => p.name === name) || null;
}

/**
 * Convert cell array to initial config string format
 */
export function cellsToInitialConfig(cells: number[]): string {
    return cells.join(",");
}

/**
 * Get initialization data from a preset to pass to CA constructor
 */
export function getPresetInitializationData(preset: Preset): { width: number; height: number; initialPattern: string } {
    return {
        width: preset.width,
        height: preset.height,
        initialPattern: preset.initialPattern ? cellsToInitialConfig(preset.initialPattern) : "1",
    };
}

/**
 * Get initialization data from a full state to recreate CA
 */
export function getStateInitializationData(state: FullState): { width: number; height: number; initialPattern: string } {
    return {
        width: state.width,
        height: state.height,
        initialPattern: cellsToInitialConfig(state.cells),
    };
}
export function createPresetFromCA(
    ca: CA,
    name: string,
    includePattern: boolean = false
): Preset {
    return {
        name,
        neighborhood: ca.currentNeighborhoodType,
        rule: ca.currentRule.name,
        width: ca.canvasSpace.width_count,
        height: ca.canvasSpace.height_count,
        initialPattern: includePattern ? Array.from(ca.cellSpace.cells.map((c) => c.state)) : undefined,
        createdAt: Date.now(),
    };
}

/**
 * Export CA full state to JSON string
 */
export function exportStateToJSON(
    ca: CA,
    name: string,
    tickCount: number
): string {
    const state: FullState = {
        name,
        neighborhood: ca.currentNeighborhoodType,
        rule: ca.currentRule.ruleName,
        width: ca.canvasSpace.width_count,
        height: ca.canvasSpace.height_count,
        cells: ca.cellSpace.cells.map((c) => c.state),
        tickCount,
        timestamp: Date.now(),
    };
    return JSON.stringify(state, null, 2);
}

/**
 * Parse full state from JSON string
 */
export function importStateFromJSON(jsonString: string): FullState | null {
    try {
        const state = JSON.parse(jsonString) as FullState;
        // Validate required fields
        if (!state.neighborhood || !state.rule || !state.cells || typeof state.width !== "number" || typeof state.height !== "number") {
            console.error("Invalid state JSON: missing required fields");
            return null;
        }
        return state;
    } catch (e) {
        console.error("Failed to parse state JSON:", e);
        return null;
    }
}

/**
 * Trigger file download for state JSON
 */
export function downloadStateFile(jsonString: string, filename: string): void {
    const blob = new Blob([jsonString], { type: "application/json" });
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.href = url;
    link.download = filename || `ca-state-${Date.now()}.json`;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(url);
}

/**
 * Trigger file picker and read state JSON
 */
export function uploadStateFile(): Promise<string | null> {
    return new Promise((resolve) => {
        const input = document.createElement("input");
        input.type = "file";
        input.accept = ".json";
        input.onchange = (e: any) => {
            const file = e.target.files[0];
            if (!file) {
                resolve(null);
                return;
            }
            const reader = new FileReader();
            reader.onload = (event: any) => {
                resolve(event.target.result);
            };
            reader.onerror = () => {
                console.error("Failed to read file");
                resolve(null);
            };
            reader.readAsText(file);
        };
        input.click();
    });
}
