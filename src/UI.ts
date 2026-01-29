/**
 * UI Module - Handles all user interface interactions and initialization
 * Separates UI concerns from core cellular automaton logic
 */

import { NeighborhoodType } from "./CARule";
import * as eca from "./ECA";
import * as persistence from "./Persistence";
import { Vector } from "@geometric/vector";

// Paintbrush state management
let isPaintbrushActive: boolean = false;
let currentPaintState: number = 0;
let isPainting: boolean = false; // Track if mouse is currently down and painting

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
export function initializeUI() {
  persistence.initializePresets();
  initializeNavigationHandlers();
  initializeSelectHandlers();
  initializeSimulationControls();
  initializePaintbrushControls();
  initializePaintbrushMouseHandlers();
  initializePersistenceControls();
}

/**
 * Set up sidebar navigation (open/close)
 */
function initializeNavigationHandlers() {
  // Navigation handlers are called from HTML onclick attributes
  // They just manipulate DOM, no external dependencies needed
}

/**
 * Initialize neighborhood and rule dropdowns
 */
function initializeSelectHandlers() {
  initializeNeighborhoodSelect();
  attachSelectEventListeners();
}

/**
 * Initialize neighborhood dropdown from available neighborhoods
 */
function initializeNeighborhoodSelect() {
  const neighborhoodSelect = document.getElementById("neighborhoodSelect") as HTMLSelectElement;
  if (!neighborhoodSelect) return;

  const neighborhoods = eca.getAvailableNeighborhoods();
  neighborhoods.forEach(({ type, label }) => {
    const option = document.createElement("option");
    option.value = type;
    option.textContent = label;
    neighborhoodSelect.appendChild(option);
  });

  // Set the dropdown to match the CA's current neighborhood type
  const currentNeighborhoodType = eca.getCurrentNeighborhoodType();
  neighborhoodSelect.value = currentNeighborhoodType;

  // Initialize rules for the current neighborhood
  initializeRuleSelect(currentNeighborhoodType);

  // Set the rule dropdown to match the CA's current rule
  const currentRuleName = eca.getCurrentRuleName();
  const ruleSelect = document.getElementById("ruleSelect") as HTMLSelectElement;
  if (ruleSelect) {
    ruleSelect.value = currentRuleName;
  }
}

/**
 * Initialize rule dropdown for a given neighborhood type
 */
function initializeRuleSelect(neighborhoodType: string) {
  const ruleSelect = document.getElementById("ruleSelect") as HTMLSelectElement;
  if (!ruleSelect) return;

  ruleSelect.innerHTML = "";
  const rules = eca.getAvailableRulesForNeighborhood(neighborhoodType as any);
  rules.forEach(({ key, label }) => {
    const option = document.createElement("option");
    option.value = key;
    option.textContent = label;
    ruleSelect.appendChild(option);
  });
}

/**
 * Attach event listeners to select elements
 */
function attachSelectEventListeners() {
  const neighborhoodSelect = document.getElementById("neighborhoodSelect") as HTMLSelectElement;
  const ruleSelect = document.getElementById("ruleSelect") as HTMLSelectElement;

  if (neighborhoodSelect) {
    neighborhoodSelect.addEventListener("change", handleNeighborhoodChange);
  }

  if (ruleSelect) {
    ruleSelect.addEventListener("change", handleRuleChange);
  }
}

/**
 * Handle neighborhood type selection change
 */
function handleNeighborhoodChange() {
  const neighborhoodSelect = document.getElementById("neighborhoodSelect") as HTMLSelectElement;
  const value = neighborhoodSelect.value;
  initializeRuleSelect(value);
  eca.switchNeighborhoodType(value);
  // Update paint state selector when neighborhood changes (rule may have changed)
  updatePaintStateSelector();
}

/**
 * Handle rule selection change
 */
function handleRuleChange() {
  const ruleSelect = document.getElementById("ruleSelect") as HTMLSelectElement;
  eca.switchRule(ruleSelect.value);
  // Update paint state selector when rule changes
  updatePaintStateSelector();
}

/**
 * Initialize simulation control listeners (tick rate, stop button)
 */
function initializeSimulationControls() {
  const stopButton = document.getElementById("stopButton") as HTMLInputElement;
  const tickRateInput = document.getElementById("tickRate") as HTMLInputElement;
  const configForm = document.getElementById("configForm") as HTMLFormElement;

  if (stopButton) {
    stopButton.addEventListener("click", eca.toggleTickLoop);
  }

  if (tickRateInput) {
    tickRateInput.addEventListener("change", eca.triggerTickRateChange);
  }

  if (configForm) {
    configForm.addEventListener("submit", eca.submitEvent);
  }
}

/**
 * Global navigation functions called from HTML onclick attributes
 */
export function openNav() {
  const sidebar = document.getElementById("mySidebar");
  const canvas = document.getElementById("myCanvas");
  if (sidebar) sidebar.style.width = "250px";
  if (canvas) (canvas as any).style.marginLeft = "250px";
}

export function closeNav() {
  const sidebar = document.getElementById("mySidebar");
  const canvas = document.getElementById("myCanvas");
  if (sidebar) sidebar.style.width = "0";
  if (canvas) (canvas as any).style.marginLeft = "0";
}

/**
 * Initialize paintbrush UI controls (toggle and state selector)
 */
function initializePaintbrushControls() {
  const paintbrushToggle = document.getElementById("paintbrushToggle") as HTMLInputElement;
  const paintStateSelect = document.getElementById("paintStateSelect") as HTMLSelectElement;

  if (paintbrushToggle) {
    paintbrushToggle.addEventListener("change", handlePaintbrushToggle);
  }

  if (paintStateSelect) {
    paintStateSelect.addEventListener("change", handlePaintStateChange);
  }

  // Initialize paint state selector with current rule's states
  updatePaintStateSelector();
}

/**
 * Update the paint state selector dropdown based on the current rule
 */
function updatePaintStateSelector() {
  const paintStateSelect = document.getElementById("paintStateSelect") as HTMLSelectElement;
  if (!paintStateSelect) return;

  // Get current rule's available states
  const currentRuleName = eca.getCurrentRuleName();
  const currentNeighborhoodType = eca.getCurrentNeighborhoodType();
  const rules = eca.getAvailableRulesForNeighborhood(currentNeighborhoodType);
  const currentRule = rules.find(r => r.key === currentRuleName);

  if (!currentRule) return;

  // Get the actual rule instance to call getAvailableStates()
  // We need to access the rule registry - let's add a helper function in ECA
  const availableStates = eca.getRuleAvailableStates(currentRuleName);

  paintStateSelect.innerHTML = "";
  availableStates.forEach((state) => {
    const option = document.createElement("option");
    option.value = state.toString();
    option.textContent = eca.getRuleStateLabel(currentRuleName, state);
    paintStateSelect.appendChild(option);
  });

  // Set default to first state
  if (availableStates.length > 0) {
    currentPaintState = availableStates[0];
    paintStateSelect.value = availableStates[0].toString();
  }
}

/**
 * Handle paintbrush toggle change
 */
function handlePaintbrushToggle() {
  const paintbrushToggle = document.getElementById("paintbrushToggle") as HTMLInputElement;
  isPaintbrushActive = paintbrushToggle.checked;

  // Pause simulation when paintbrush is activated
  if (isPaintbrushActive) {
    // Check if simulation is running and pause it
    const stopButton = document.getElementById("stopButton") as HTMLInputElement;
    if (stopButton && !stopButton.checked) {
      // Simulation is running, pause it
      eca.toggleTickLoop();
    }
  }
}

/**
 * Handle paint state selection change
 */
function handlePaintStateChange() {
  const paintStateSelect = document.getElementById("paintStateSelect") as HTMLSelectElement;
  if (paintStateSelect) {
    currentPaintState = parseInt(paintStateSelect.value, 10);
  }
}

/**
 * Initialize native canvas mouse event handlers for paintbrush
 */
function initializePaintbrushMouseHandlers() {
  const canvasElement = document.getElementById("myCanvas") as HTMLCanvasElement;
  if (!canvasElement) {
    console.error("Canvas element 'myCanvas' not found");
    return;
  }

  canvasElement.addEventListener("mousedown", (event: MouseEvent) => {
    if (isPaintbrushActive) {
      isPainting = true;
      const coords = getCanvasCoordinates(canvasElement, event.clientX, event.clientY);
      paintAtPoint(coords);
    }
  });

  canvasElement.addEventListener("mousemove", (event: MouseEvent) => {
    if (isPaintbrushActive && isPainting) {
      const coords = getCanvasCoordinates(canvasElement, event.clientX, event.clientY);
      paintAtPoint(coords);
      // NOTE: paintAtPoint now only marks cells as dirty, doesn't redraw
      // Redraw happens via requestAnimationFrame render loop
    }
  });

  canvasElement.addEventListener("mouseup", (event: MouseEvent) => {
    if (isPaintbrushActive) {
      isPainting = false;
      // Trigger final redraw when paint stroke completes
      eca.resizeEvent(new Event("mouseup")); // Reuse resizeEvent to trigger redraw
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
  if (cellPosition !== null) {
    eca.paintCell(cellPosition, currentPaintState);
  }
}

/**
 * Initialize persistence controls (presets and full state export/import)
 */
function initializePersistenceControls() {
  // Populate preset dropdown
  populatePresetDropdown();

  // Preset controls
  const loadPresetBtn = document.getElementById("loadPresetButton") as HTMLButtonElement;
  const deletePresetBtn = document.getElementById("deletePresetButton") as HTMLButtonElement;
  const savePresetBtn = document.getElementById("savePresetButton") as HTMLButtonElement;

  if (loadPresetBtn) {
    loadPresetBtn.addEventListener("click", () => {
      const presetSelect = document.getElementById("presetSelect") as HTMLSelectElement;
      const presetName = presetSelect?.value;
      if (presetName) {
        console.log("Loading preset:", presetName);
        loadPreset(presetName);
      } else {
        alert("Please select a preset");
      }
    });
  }

  if (deletePresetBtn) {
    deletePresetBtn.addEventListener("click", () => {
      const presetSelect = document.getElementById("presetSelect") as HTMLSelectElement;
      const presetName = presetSelect?.value;
      if (presetName) {
        if (confirm(`Delete preset "${presetName}"?`)) {
          persistence.deletePreset(presetName);
          populatePresetDropdown();
          alert("Preset deleted");
        }
      } else {
        alert("Please select a preset");
      }
    });
  }

  if (savePresetBtn) {
    savePresetBtn.addEventListener("click", () => {
      const presetName = (document.getElementById("newPresetName") as HTMLInputElement)?.value;
      const includePattern = (document.getElementById("includePatternCheckbox") as HTMLInputElement)?.checked;

      if (!presetName) {
        alert("Please enter a preset name");
        return;
      }

      const ca = eca.getCurrentCA();
      if (!ca) {
        alert("No CA instance available");
        return;
      }

      const preset = persistence.createPresetFromCA(ca, presetName, includePattern);
      persistence.savePreset(preset);
      populatePresetDropdown();
      (document.getElementById("newPresetName") as HTMLInputElement).value = "";
      alert("Preset saved");
    });
  }

  // Full state controls
  const exportStateBtn = document.getElementById("exportStateButton") as HTMLButtonElement;
  const importStateBtn = document.getElementById("importStateButton") as HTMLButtonElement;

  if (exportStateBtn) {
    exportStateBtn.addEventListener("click", () => {
      const ca = eca.getCurrentCA();
      if (!ca) {
        alert("No CA instance available");
        return;
      }

      const stateName = (document.getElementById("stateName") as HTMLInputElement)?.value || "ca-state";
      const tickCount = eca.getTickCount?.() || 0;
      const json = persistence.exportStateToJSON(ca, stateName, tickCount);
      persistence.downloadStateFile(json, `${stateName}-${Date.now()}.json`);
    });
  }

  if (importStateBtn) {
    importStateBtn.addEventListener("click", async () => {
      const jsonString = await persistence.uploadStateFile();
      if (!jsonString) {
        return;
      }

      const state = persistence.importStateFromJSON(jsonString);
      if (!state) {
        alert("Invalid state file");
        return;
      }

      // Load the state
      loadFullState(state);
    });
  }
}

/**
 * Populate preset dropdown with saved presets
 */
function populatePresetDropdown() {
  const presetSelect = document.getElementById("presetSelect") as HTMLSelectElement;
  if (!presetSelect) return;

  presetSelect.innerHTML = '<option value="">-- Select a preset --</option>';
  const presets = persistence.getAllPresets();
  presets.forEach((preset) => {
    const option = document.createElement("option");
    option.value = preset.name;
    option.textContent = preset.name;
    presetSelect.appendChild(option);
  });
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

  // Update form fields
  (document.getElementById("width") as HTMLInputElement).value = initData.width.toString();
  (document.getElementById("height") as HTMLInputElement).value = initData.height.toString();
  (document.getElementById("initialConfig") as HTMLInputElement).value = initData.initialPattern;

  // Update neighborhood dropdown and rebuild rules
  const neighborhoodSelect = document.getElementById("neighborhoodSelect") as HTMLSelectElement;
  if (neighborhoodSelect) {
    neighborhoodSelect.value = preset.neighborhood;
    // Directly rebuild rule select instead of dispatching event to avoid race condition
    initializeRuleSelect(preset.neighborhood);
    // Call neighborhood change handler logic
    eca.switchNeighborhoodType(preset.neighborhood);
    updatePaintStateSelector();
  }

  // Set rule value immediately (rules are now populated)
  const ruleSelect = document.getElementById("ruleSelect") as HTMLSelectElement;
  if (ruleSelect) {
    ruleSelect.value = preset.rule;
    // Trigger rule change handler
    eca.switchRule(preset.rule);
    updatePaintStateSelector();
  }

  // Submit to apply configuration
  const submitButton = document.getElementById("submitButton") as HTMLInputElement;
  if (submitButton) {
    submitButton.click();
  }
}

/**
 * Load a full state and restore CA to that state
 */
function loadFullState(state: persistence.FullState) {
  const initData = persistence.getStateInitializationData(state);

  // Update form fields
  (document.getElementById("width") as HTMLInputElement).value = initData.width.toString();
  (document.getElementById("height") as HTMLInputElement).value = initData.height.toString();
  (document.getElementById("initialConfig") as HTMLInputElement).value = initData.initialPattern;

  // Update neighborhood dropdown and rebuild rules
  const neighborhoodSelect = document.getElementById("neighborhoodSelect") as HTMLSelectElement;
  if (neighborhoodSelect) {
    neighborhoodSelect.value = state.neighborhood;
    // Directly rebuild rule select instead of dispatching event to avoid race condition
    initializeRuleSelect(state.neighborhood);
    // Call neighborhood change handler logic
    eca.switchNeighborhoodType(state.neighborhood);
    updatePaintStateSelector();
  }

  // Set rule value immediately (rules are now populated)
  const ruleSelect = document.getElementById("ruleSelect") as HTMLSelectElement;
  if (ruleSelect) {
    ruleSelect.value = state.rule;
    // Trigger rule change handler
    eca.switchRule(state.rule);
    updatePaintStateSelector();
  }

  // Submit form to create CA with new configuration and initial cell states
  const submitButton = document.getElementById("submitButton") as HTMLInputElement;
  if (submitButton) {
    submitButton.click();
  }

  alert(`State loaded: "${state.name}" (${state.tickCount} ticks)`);
}

