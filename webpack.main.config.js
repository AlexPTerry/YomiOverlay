// const CopyWebpackPlugin = require("copy-webpack-plugin");
const path = require("path");

module.exports = {
  /**
   * This is the main entry point for your application, it's the first file
   * that runs in the main process.
   */
  entry: './src/main.js',
  // Put your normal webpack config below here
  module: {
    rules: require('./webpack.rules'),
  },
  externals: {
    'uiohook-napi': 'commonjs uiohook-napi' // Prevent Webpack from bundling it
  },
  // node: { __dirname: true },
  // plugins: [
  //   new CopyWebpackPlugin({
  //     patterns: [
  //       {
  //         from: path.resolve(__dirname, "node_modules/uiohook-napi/prebuilds"),
  //         to: "native_modules/build/uiohook-napi" // Copies to the Webpack build directory
  //       },
  //       {
  //         from: path.resolve(__dirname, "node_modules/uiohook-napi/build/Release"),
  //         to: "native_modules/build/uiohook-napi-release" // Copies to the Webpack build directory
  //       }
  //     ]
  //   })
  // ],
};
