/**
 * UI Module - Handles all user interface interactions and initialization
 * Separates UI concerns from core cellular automaton logic
 */

import * as paper from "paper";
import * as eca from "./ECA";
import { Vector } from "@geometric/vector";

// Paintbrush state management
let isPaintbrushActive: boolean = false;
let currentPaintState: number = 0;
let isPainting: boolean = false; // Track if mouse is currently down and painting

/**
 * Initialize all UI elements and event listeners
 */
export function initializeUI() {
  initializeNavigationHandlers();
  initializeSelectHandlers();
  initializeSimulationControls();
  initializePaintbrushControls();
  initializePaintbrushMouseHandlers();
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
 * Initialize Paper.js mouse event handlers for paintbrush
 */
function initializePaintbrushMouseHandlers() {
  paper.view.onMouseDown = (event: paper.MouseEvent) => {
    if (isPaintbrushActive) {
      isPainting = true;
      paintAtPoint(event.point);
    }
  };

  paper.view.onMouseDrag = (event: paper.MouseEvent) => {
    if (isPaintbrushActive && isPainting) {
      paintAtPoint(event.point);
    }
  };

  paper.view.onMouseUp = (event: paper.MouseEvent) => {
    if (isPaintbrushActive) {
      isPainting = false;
    }
  };
}

/**
 * Paint at the given Paper.js point
 */
function paintAtPoint(point: paper.Point) {
  const cellPosition = eca.canvasPointToCellPosition(point);
  if (cellPosition !== null) {
    eca.paintCell(cellPosition, currentPaintState);
  }
}
