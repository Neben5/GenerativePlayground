const path = require("path");

module.exports = {
  entry: "./dist/src/index.js",
  devtool: "inline-source-map",

  resolve: {
    extensions: [".tsx", ".ts", ".js"],
  },
  output: {
    filename: "bundle.js",
    path: path.resolve(__dirname, "dist"),
  },
};
