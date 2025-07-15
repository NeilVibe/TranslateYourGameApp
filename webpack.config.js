const path = require('path');
const HtmlWebpackPlugin = require('html-webpack-plugin');
const webpack = require('webpack');

module.exports = {
  entry: './src/renderer/index.tsx',
  target: 'web', // Changed from 'electron-renderer' to 'web'
  output: {
    path: path.resolve(__dirname, 'build'),
    filename: 'renderer.js',
  },
  module: {
    rules: [
      {
        test: /\.(ts|tsx)$/,
        use: {
          loader: 'ts-loader',
          options: {
            configFile: 'tsconfig.renderer.json',
            transpileOnly: true
          }
        },
        exclude: /node_modules/,
      },
      {
        test: /\.(js|jsx)$/,
        exclude: /node_modules/,
        use: {
          loader: 'ts-loader',
          options: {
            configFile: 'tsconfig.renderer.json',
            transpileOnly: true
          }
        },
      },
      {
        test: /\.css$/,
        use: ['style-loader', 'css-loader'],
      },
      {
        test: /\.(png|svg|jpg|jpeg|gif|ico|woff|woff2|eot|ttf)$/,
        type: 'asset/resource',
      },
    ],
  },
  plugins: [
    new HtmlWebpackPlugin({
      template: './src/renderer/index.html',
      filename: 'index.html',
      inject: 'body', // Let webpack inject the script properly
    }),
    new webpack.ProvidePlugin({
      process: 'process/browser.js',
    }),
  ],
  resolve: {
    extensions: ['.tsx', '.ts', '.jsx', '.js'],
    fallback: {
      "path": require.resolve("path-browserify"),
      "buffer": require.resolve("buffer"),
      "process": require.resolve("process/browser.js"),
      "stream": require.resolve("stream-browserify"),
      "util": require.resolve("util"),
      "timers": require.resolve("timers-browserify")
    }
  },
};