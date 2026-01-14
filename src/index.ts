import * as _ from "lodash";
import * as eca from "./ECA"
import { entry } from "../webpack.config";


document.addEventListener("DOMContentLoaded", function (arg) {
  eca.entry();
  document.addEventListener("submit", eca.submitEvent);
});

window.addEventListener("resize", eca.resizeEvent);
window.addEventListener("keypress", eca.keypressEvent);