import * as _ from "lodash";
import * as eca from "./ECA";
// import { entry } from "../webpack.config";

document.addEventListener("DOMContentLoaded", function (arg) {
  document.addEventListener("submit", eca.submitEvent);
  const stopButton = document.getElementById("stopButton");
  const tickRateInput = document.getElementById("tickRate");
  
  stopButton.addEventListener("click", eca.toggleTickLoop);
  tickRateInput.addEventListener("change", eca.triggerTickRateChange);
  
  eca.entry();
  
  // Initialize dropdowns from available neighborhoods and rules
  if ((window as any).initializeNeighborhoodSelect) {
    (window as any).initializeNeighborhoodSelect();
  }
});

window.addEventListener("resize", eca.resizeEvent);
window.addEventListener("keypress", eca.keypressEvent);

// Export functions to global window for HTML onclick handlers
(window as any).switchNeighborhoodType = eca.switchNeighborhoodType;
(window as any).switchRule = eca.switchRule;
(window as any).getAvailableNeighborhoods = eca.getAvailableNeighborhoods;
(window as any).getAvailableRulesForNeighborhood = eca.getAvailableRulesForNeighborhood;