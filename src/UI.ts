/**
 * UI Module - Handles all user interface interactions and initialization
 * Separates UI concerns from core cellular automaton logic
 */

import { NeighborhoodType } from "./CARule";
import * as eca from "./ECA";
import * as persistence from "./Persistence";
import { Vector } from "@geometric/vector";
import * as dat from 'dat.gui';
import { getDebugConfig } from "./DebugConfig";

// Canvas element reference
let canvasElement: HTMLCanvasElement | null = null;

// Paintbrush state management
let isPaintbrushActive: boolean = false;
let currentPaintState: number = 0;
let isPainting: boolean = false; // Track if mouse is currently down and painting

// dat.GUI instance
let gui: dat.GUI | null = null;

// Configuration object for dat.GUI
const config = {
  width: 8,
  height: 1,
  initialConfig: '1,0,1,0,1,0,1,0',
  neighborhood: 'elementary',
  rule: 'rule110',
  tickRate: 60,
  paused: false,
  paintbrushMode: false,
  paintState: 0,
  // Debug settings
  showFPS: true,
  showTickRate: true,
  targetFPS: 60,
  consoleLogging: false,
  ecaIterationDebug: false,
  ruleIterationDebug: false,


  submit: () => {
    if (!canvasElement) {
      console.error("Canvas element not initialized");
      return;
    }

    // Update hidden form fields for backwards compatibility
    const widthInput = document.getElementById('width') as HTMLInputElement;
    const heightInput = document.getElementById('height') as HTMLInputElement;
    const initialConfigInput = document.getElementById('initialConfig') as HTMLInputElement;

    if (widthInput) widthInput.value = config.width.toString();
    if (heightInput) heightInput.value = config.height.toString();
    if (initialConfigInput) initialConfigInput.value = config.initialConfig;

    // Trigger form submission with canvas element
    eca.submitDimensions(config.width, config.height, config.initialConfig, canvasElement);
  },
  loadPreset: '',
  savePresetName: '',
  includePattern: false,

  exportState: () => {
    const ca = eca.getCurrentCA();
    if (!ca) {
      alert("No CA instance available");
      return;
    }
    const stateName = config.savePresetName || "ca-state";
    const tickCount = eca.getTickCount?.() || 0;
    const json = persistence.exportStateToJSON(ca, stateName, tickCount);
    persistence.downloadStateFile(json, `${stateName}-${Date.now()}.json`);
  },
  importState: async () => {
    const jsonString = await persistence.uploadStateFile();
    if (!jsonString) {
      return;
    }
    const state = persistence.importStateFromJSON(jsonString);
    if (!state) {
      alert("Invalid state file");
      return;
    }
    loadFullState(state);
  }
};

/**
 * Convert client coordinates to canvas space coordinates
 */
function getCanvasCoordinates(canvasElement: HTMLCanvasElement, clientX: number, clientY: number): { x: number; y: number } {
  const rect = canvasElement.getBoundingClientRect();
  return {
    x: clientX - rect.left,
    y: clientY - rect.top
  };
}

/**
 * Initialize all UI elements and event listeners
 */
export function initializeUI(canvas: HTMLCanvasElement) {
  canvasElement = canvas;
  persistence.initializePresets();
  initializeDatGUI();
  initializePaintbrushMouseHandlers();
  // Listen for ECA events to synchronize UI when CA is created/updated
  try {
    window.addEventListener('eca:created', () => syncUIWithCA());
    window.addEventListener('eca:updated', () => syncUIWithCA());
  } catch (e) { }
  // Initial sync
  syncUIWithCA();
}

/**
 * Initialize dat.GUI panel
 */
function initializeDatGUI() {
  if (gui) {
    gui.destroy();
  }

  gui = new dat.GUI({ width: 300 });

  // Space Configuration folder
  const spaceFolder = gui.addFolder('Space Configuration');
  spaceFolder.add(config, 'width', 1, 255).step(1).name('Width');
  spaceFolder.add(config, 'height', 1, 1000).step(1).name('Height');
  spaceFolder.add(config, 'initialConfig').name('Initial Config');
  spaceFolder.add(config, 'submit').name('Submit');
  spaceFolder.open();

  // Simulation Settings folder
  const simFolder = gui.addFolder('Simulation Settings');

  // Build neighborhood options
  const neighborhoods = eca.getAvailableNeighborhoods();
  const neighborhoodOptions: { [key: string]: string } = {};
  neighborhoods.forEach(({ type, label }) => {
    neighborhoodOptions[label] = type;
  });

  const neighborhoodController = simFolder.add(config, 'neighborhood', neighborhoodOptions).name('Neighborhood');
  neighborhoodController.onChange((value: string) => {
    // Update rule options
    updateRuleOptions();
    eca.switchNeighborhoodType(value);
    updatePaintStateOptions();
  });

  // Rule selector will be dynamically updated
  const ruleController = simFolder.add(config, 'rule', {}).name('Rule');
  ruleController.onChange((value: string) => {
    eca.switchRule(value);
    eca.setTickRate(config.tickRate);
    updatePaintStateOptions();
  });

  simFolder.add(config, 'tickRate', 0, 255).step(1).name('Tick Rate (hz)').onChange((value: number) => {
    eca.setTickRate(value);
  });

  simFolder.add(config, 'paused').name('Paused').onChange((value: boolean) => {
    if (value !== !eca.isRunning()) {
      eca.toggleTickLoop();
    }
  });

  simFolder.open();

  // Paintbrush folder
  const paintFolder = gui.addFolder('Paintbrush');
  paintFolder.add(config, 'paintbrushMode').name('Paintbrush Mode').onChange((value: boolean) => {
    isPaintbrushActive = value;
    if (isPaintbrushActive && eca.isRunning()) {
      eca.toggleTickLoop();
      config.paused = true;
      // Update GUI to reflect pause
      gui?.updateDisplay();
    }
  });

  const paintStateController = paintFolder.add(config, 'paintState', {}).name('Paint State');
  paintStateController.onChange((value: any) => {
    currentPaintState = Number(value);
  });

  paintFolder.open();

  // Presets folder
  const presetsFolder = gui.addFolder('Presets');
  const presetOptions: { [key: string]: string } = { '-- Select --': '' };
  persistence.getAllPresets().forEach((preset) => {
    presetOptions[preset.name] = preset.name;
  });

  presetsFolder.add(config, 'loadPreset', presetOptions).name('Load Preset').onChange((value: string) => {
    if (value) {
      loadPreset(value);
      updatePresetOptions();
    }
  });

  presetsFolder.add(config, 'savePresetName').name('Save as Preset');
  presetsFolder.add(config, 'includePattern').name('Include Pattern');
  presetsFolder.add({
    savePreset: () => {
      if (!config.savePresetName) {
        alert("Please enter a preset name");
        return;
      }
      const ca = eca.getCurrentCA();
      if (!ca) {
        alert("No CA instance available");
        return;
      }
      const preset = persistence.createPresetFromCA(ca, config.savePresetName, config.includePattern);
      persistence.savePreset(preset);
      config.savePresetName = '';
      updatePresetOptions();
      gui?.updateDisplay();
      alert("Preset saved");
    }
  }, 'savePreset').name('Save');

  presetsFolder.add({
    deletePreset: () => {
      if (!config.loadPreset) {
        alert("Please select a preset");
        return;
      }
      if (confirm(`Delete preset "${config.loadPreset}"?`)) {
        persistence.deletePreset(config.loadPreset);
        config.loadPreset = '';
        updatePresetOptions();
        gui?.updateDisplay();
        alert("Preset deleted");
      }
    }
  }, 'deletePreset').name('Delete');

  presetsFolder.open();

  // State Management folder
  const stateFolder = gui.addFolder('State Management');
  stateFolder.add(config, 'exportState').name('Export State');
  stateFolder.add(config, 'importState').name('Import State');
  stateFolder.open();

  // Debug folder
  const debugFolder = gui.addFolder('Debug');
  debugFolder.add(config, 'showFPS').name('Show FPS').onChange((value: boolean) => {
    getDebugConfig().toggleFPS(value);
  });

  debugFolder.add(config, 'showTickRate').name('Show Tick Rate').onChange((value: boolean) => {
    getDebugConfig().toggleTickRate(value);
  });

  debugFolder.add(config, 'consoleLogging').name('Console Logging').onChange((value: boolean) => {
    getDebugConfig().toggleConsoleLogging(value);
  });

  debugFolder.add(config, 'ecaIterationDebug').name('ECA Iteration Debug').onChange((value: boolean) => {
    getDebugConfig().setECAIterationDebug(value);
  });

  debugFolder.add(config, 'ruleIterationDebug').name('Rule Iteration Debug').onChange((value: boolean) => {
    getDebugConfig().setRuleIterationDebug(value);
  });

  debugFolder.open();

  // Initialize rule and paint state options
  updateRuleOptions();
  updatePaintStateOptions();
}

/**
 * Update rule dropdown options based on current neighborhood
 */
function updateRuleOptions() {
  const rules = eca.getAvailableRulesForNeighborhood(config.neighborhood as any);
  const ruleOptions: { [key: string]: string } = {};
  rules.forEach(({ key, label }) => {
    ruleOptions[label] = key;
  });

  // Find the rule controller and update its options
  if (gui) {
    const simFolder = gui.__folders['Simulation Settings'];
    if (simFolder) {
      // Remove old controller
      const oldController = simFolder.__controllers.find((c: any) => c.property === 'rule');
      if (oldController) {
        simFolder.remove(oldController);
      }

      // Add new controller with updated options
      config.rule = rules[0]?.key || '';
      const newController = simFolder.add(config, 'rule', ruleOptions).name('Rule');
      newController.onChange((value: string) => {
        eca.switchRule(value);
        eca.setTickRate(config.tickRate);
        updatePaintStateOptions();
      });
    }
  }
}

/**
 * Update paint state options based on current rule
 */
function updatePaintStateOptions() {
  const availableStates = eca.getRuleAvailableStates(config.rule);
  const stateOptions: { [key: string]: number } = {};
  availableStates.forEach((state) => {
    const label = eca.getRuleStateLabel(config.rule, state);
    stateOptions[label] = state;
  });

  // Find the paint state controller and update its options
  if (gui) {
    const paintFolder = gui.__folders['Paintbrush'];
    if (paintFolder) {
      // Remove old controller
      const oldController = paintFolder.__controllers.find((c: any) => c.property === 'paintState');
      if (oldController) {
        paintFolder.remove(oldController);
      }

      // Add new controller with updated options
      config.paintState = availableStates[0] || 0;
      currentPaintState = config.paintState;
      const newController = paintFolder.add(config, 'paintState', stateOptions).name('Paint State');
      newController.onChange((value: any) => {
        currentPaintState = Number(value);
      });
    }
  }
}

/**
 * Update preset dropdown options
 */
function updatePresetOptions() {
  const presetOptions: { [key: string]: string } = { '-- Select --': '' };
  persistence.getAllPresets().forEach((preset) => {
    presetOptions[preset.name] = preset.name;
  });

  if (gui) {
    const presetsFolder = gui.__folders['Presets'];
    if (presetsFolder) {
      // Remove old controller
      const oldController = presetsFolder.__controllers.find((c: any) => c.property === 'loadPreset');
      if (oldController) {
        presetsFolder.remove(oldController);
      }

      // Add new controller with updated options
      config.loadPreset = '';
      const newController = presetsFolder.add(config, 'loadPreset', presetOptions).name('Load Preset');
      newController.onChange((value: string) => {
        if (value) {
          loadPreset(value);
          updatePresetOptions();
        }
      });
    }
  }
}

/**
 * Synchronize UI controls with current CA state
 */
export function syncUIWithCA() {
  const ca = eca.getCurrentCA();
  if (!ca) return;

  // Update config object
  config.neighborhood = eca.getCurrentNeighborhoodType();
  config.rule = eca.getCurrentRuleName();
  config.tickRate = eca.getTickRate();
  config.paused = !eca.isRunning();

  // Update GUI display
  updateRuleOptions();
  updatePaintStateOptions();

  if (gui) {
    gui.updateDisplay();
  }
}

/**
 * Load a preset and apply its configuration
 */
function loadPreset(presetName: string) {
  const preset = persistence.getPreset(presetName);
  console.log("Loading preset data:", preset);
  if (!preset) {
    alert("Preset not found");
    return;
  }

  const initData = persistence.getPresetInitializationData(preset);

  // Update config object
  config.width = initData.width;
  config.height = initData.height;
  config.initialConfig = initData.initialPattern;
  config.neighborhood = preset.neighborhood;
  config.rule = preset.rule;

  // Update ECA
  eca.switchNeighborhoodType(preset.neighborhood);
  updateRuleOptions();
  eca.switchRule(preset.rule);
  updatePaintStateOptions();

  // Update GUI
  if (gui) {
    gui.updateDisplay();
  }

  // Submit to apply configuration
  config.submit();
}

/**
 * Load a full state and restore CA to that state
 */
function loadFullState(state: persistence.FullState) {
  const initData = persistence.getStateInitializationData(state);

  // Update config object
  config.width = initData.width;
  config.height = initData.height;
  config.initialConfig = initData.initialPattern;
  config.neighborhood = state.neighborhood;
  config.rule = state.rule;

  // Update ECA
  eca.switchNeighborhoodType(state.neighborhood);
  updateRuleOptions();
  eca.switchRule(state.rule);
  updatePaintStateOptions();

  // Update GUI
  if (gui) {
    gui.updateDisplay();
  }

  // Submit to apply configuration
  config.submit();

  alert(`State loaded: "${state.name}" (${state.tickCount} ticks)`);
}

/**
 * Initialize native canvas mouse event handlers for paintbrush
 */
function initializePaintbrushMouseHandlers() {
  if (!canvasElement) {
    console.error("Canvas element not initialized");
    return;
  }

  canvasElement.addEventListener("mousedown", (event: MouseEvent) => {
    if (isPaintbrushActive && canvasElement) {
      isPainting = true;
      const coords = getCanvasCoordinates(canvasElement, event.clientX, event.clientY);
      paintAtPoint(coords);
    }
  });

  canvasElement.addEventListener("mousemove", (event: MouseEvent) => {
    if (isPaintbrushActive && isPainting && canvasElement) {
      const coords = getCanvasCoordinates(canvasElement, event.clientX, event.clientY);
      paintAtPoint(coords);
    }
  });

  canvasElement.addEventListener("mouseup", (event: MouseEvent) => {
    if (isPaintbrushActive) {
      isPainting = false;
      eca.resizeEvent();
    }
  });

  canvasElement.addEventListener("mouseleave", (event: MouseEvent) => {
    if (isPaintbrushActive) {
      isPainting = false;
    }
  });
}

/**
 * Paint at the given canvas coordinates
 */
function paintAtPoint(coords: { x: number; y: number }) {
  const cellPosition = eca.canvasPointToCellPosition(coords);
  console.debug(`Painting ${currentPaintState} at canvas coordinates (${coords.x}, ${coords.y}), which maps to cell position ${cellPosition}`);
  if (cellPosition !== null) {
    eca.paintCell(cellPosition, currentPaintState);
  }
}

