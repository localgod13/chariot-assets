const { CleanWebpackPlugin } = require("clean-webpack-plugin")
const HtmlWebpackPlugin = require("html-webpack-plugin")
const path = require("path")
const webpack = require("webpack")

module.exports = {
  mode: "development",
  devtool: "eval-source-map",
  entry: "./src/main.ts",
  output: {
    path: path.resolve(process.cwd(), "dist"),
    filename: "bundle.min.js",
  },
  resolve: {
    extensions: [".ts", ".js", ".json"],
  },
  module: {
    rules: [
      {
        test: /\.js$/,
        exclude: /node_modules/,
        use: {
          loader: "babel-loader",
        },
      },
      {
        test: /\.tsx?$/,
        exclude: /node_modules/,
        loader: "ts-loader",
      },
      {
        test: [/\.vert$/, /\.frag$/],
        use: "raw-loader",
      },
      {
        test: /\.(gif|png|jpe?g|svg|xml|glsl)$/i,
        use: "file-loader",
      },
    ],
  },
  devServer: {
    host: "::",
    port: 3000,
    allowedHosts: [".beamlit.net", "localhost", "127.0.0.1"],
    client: {
      webSocketURL: {
        port: 3000,
      },
    },
    headers: {
      "X-Frame-Options": "",
      "Content-Security-Policy": "frame-ancestors *",
      "Access-Control-Allow-Origin": "*",
      "Access-Control-Allow-Methods": "GET, POST, PUT, DELETE, OPTIONS, PATCH",
      "Access-Control-Allow-Headers": "*",
      "Access-Control-Allow-Credentials": "true",
      "Access-Control-Expose-Headers": "Content-Length, X-Request-Id",
      "Access-Control-Max-Age": "86400",
      Vary: "Origin",
      "Cache-Control": "no-store, no-cache, must-revalidate, proxy-revalidate",
      Pragma: "no-cache",
      Expires: "0",
      "Surrogate-Control": "no-store",
    },
  },
  plugins: [
    new CleanWebpackPlugin({
      cleanOnceBeforeBuildPatterns: [path.join(__dirname, "dist/**/*")],
    }),
    new webpack.DefinePlugin({
      "typeof CANVAS_RENDERER": JSON.stringify(true),
      "typeof WEBGL_RENDERER": JSON.stringify(true),
      "typeof WEBGL_DEBUG": JSON.stringify(true),
      "typeof EXPERIMENTAL": JSON.stringify(true),
      "typeof PLUGIN_3D": JSON.stringify(false),
      "typeof PLUGIN_CAMERA3D": JSON.stringify(false),
      "typeof PLUGIN_FBINSTANT": JSON.stringify(false),
      "typeof FEATURE_SOUND": JSON.stringify(true),
    }),
    new HtmlWebpackPlugin({
      template: "./index.html",
      templateParameters: {
        SANDBOX_SCRIPT_URL: process.env.SANDBOX_SCRIPT_URL ?? "",
      },
    }),
  ],
}
