import * as _ from "lodash";
import * as eca from "./ECA";
import * as ui from "./UI";
import * as debugTests from "./DebugTests";
// import { entry } from "../webpack.config";

document.addEventListener("DOMContentLoaded", function (arg) {
  const canvasElement = document.getElementById("myCanvas") as HTMLCanvasElement;
  if (!canvasElement) {
    console.error("Canvas element 'myCanvas' not found");
    return;
  }

  // Initialize the simulator
  (window as any).ca = eca.entry(canvasElement);
  (window as any).eca = eca;
  (window as any).debugTests = debugTests;
  // Initialize all UI elements and event listeners
  ui.initializeUI(canvasElement);
});

window.addEventListener("resize", eca.resizeEvent);
window.addEventListener("keypress", eca.keypressEvent);