const path = require('path');
const HtmlWebpackPlugin = require('html-webpack-plugin');
const webpack = require('webpack');

module.exports = {
  entry: './src/renderer/index.tsx',
  mode: 'development',
  target: 'web', // Different from Electron version
  devtool: 'source-map',
  devServer: {
    port: 3000,
    hot: true,
    open: true,
    historyApiFallback: true,
  },
  output: {
    path: path.resolve(__dirname, 'dist-web'),
    filename: 'bundle.js',
    publicPath: '/',
  },
  resolve: {
    extensions: ['.ts', '.tsx', '.js', '.jsx'],
    fallback: {
      "stream": require.resolve("stream-browserify"),
      "timers": require.resolve("timers-browserify"),
      "util": require.resolve("util/"),
      "buffer": require.resolve("buffer"),
      "process": require.resolve("process/browser.js")
    }
  },
  module: {
    rules: [
      {
        test: /\.tsx?$/,
        use: 'ts-loader',
        exclude: /node_modules/,
      },
      {
        test: /\.css$/,
        use: ['style-loader', 'css-loader'],
      },
      {
        test: /\.(png|svg|jpg|jpeg|gif|ico)$/,
        type: 'asset/resource',
      },
      {
        test: /\.(woff|woff2|eot|ttf|otf)$/,
        type: 'asset/resource',
      },
    ],
  },
  plugins: [
    new HtmlWebpackPlugin({
      template: './src/renderer/index.html',
      filename: 'index.html',
    }),
    new webpack.ProvidePlugin({
      process: 'process/browser.js',
      Buffer: ['buffer', 'Buffer'],
    }),
  ],
};