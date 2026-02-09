import * as _ from "lodash";
import * as eca from "./ECA";
import * as ui from "./UI";
// import { entry } from "../webpack.config";

document.addEventListener("DOMContentLoaded", function (arg) {
  // Initialize the simulator
  (window as any).eca = eca.entry();


  // Initialize all UI elements and event listeners
  ui.initializeUI();
});

window.addEventListener("resize", eca.resizeEvent);
window.addEventListener("keypress", eca.keypressEvent);