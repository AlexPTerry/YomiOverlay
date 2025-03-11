const CopyWebpackPlugin = require("copy-webpack-plugin");
const path = require("path");
const TerserPlugin = require("terser-webpack-plugin");

module.exports = {
  /**
   * This is the main entry point for your application, it's the first file
   * that runs in the main process.
   */
  entry: './main/main.js',
  module: {
    rules: require('./webpack.rules'),
  },
  externals: {
    'uiohook-napi': 'commonjs uiohook-napi' // Prevent Webpack from bundling it
  },
  plugins: [
    new CopyWebpackPlugin({
      patterns: [
        {
          // Part of the workaround to get extensions to the root directory (copy's it to the webpack folder)
          from: path.resolve(__dirname, "extensions"), // Adjust if needed
          to: "extensions", // Ensure it lands where expected
        },
        require.resolve('electron-chrome-extensions/preload'),
      ],
    }),
  ],
  
  optimization: {
    minimize: true,
    minimizer: [
      // Terser errors when minimising yomitan for some reason so we ignore it
      new TerserPlugin({
        exclude: /extensions/,
      }),
    ],
  },

};
