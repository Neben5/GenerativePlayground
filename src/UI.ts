/**
 * UI Module - Handles all user interface interactions and initialization
 * Separates UI concerns from core cellular automaton logic
 */

import * as eca from "./ECA";

/**
 * Initialize all UI elements and event listeners
 */
export function initializeUI() {
  initializeNavigationHandlers();
  initializeSelectHandlers();
  initializeSimulationControls();
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
}

/**
 * Handle rule selection change
 */
function handleRuleChange() {
  const ruleSelect = document.getElementById("ruleSelect") as HTMLSelectElement;
  eca.switchRule(ruleSelect.value);
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
