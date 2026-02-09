import * as _ from "lodash";
import * as eca from "./ECA";
import * as ui from "./UI";
// import { entry } from "../webpack.config";

document.addEventListener("DOMContentLoaded", function (arg) {
  const canvasElement = document.getElementById("myCanvas") as HTMLCanvasElement;
  if (!canvasElement) {
    console.error("Canvas element 'myCanvas' not found");
    return;
  }

  // Initialize the simulator
  (window as any).eca = eca.entry(canvasElement);

  // Initialize all UI elements and event listeners
  ui.initializeUI(canvasElement);
});

window.addEventListener("resize", eca.resizeEvent);
window.addEventListener("keypress", eca.keypressEvent);