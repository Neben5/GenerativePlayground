import * as _ from "lodash";
import * as eca from "./ECA";
// import { entry } from "../webpack.config";

document.addEventListener("DOMContentLoaded", function (arg) {
  document.addEventListener("submit", eca.submitEvent);
  const stopButton = document.getElementById("stopButton");
  const tickRateInput = document.getElementById("tickRate");
  stopButton.addEventListener("click", eca.toggleTickLoop);
  tickRateInput.addEventListener("change", eca.triggerTickRateChange)
  eca.entry();
});

window.addEventListener("resize", eca.resizeEvent);
window.addEventListener("keypress", eca.keypressEvent);