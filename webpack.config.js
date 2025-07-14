const path = require('path');
const HtmlWebpackPlugin = require('html-webpack-plugin');

module.exports = {
  entry: './src/renderer/app.js',
  target: 'electron-renderer',
  output: {
    path: path.resolve(__dirname, 'build'),
    filename: 'renderer.js',
  },
  module: {
    rules: [
      {
        test: /\.css$/,
        use: ['style-loader', 'css-loader'],
      },
      {
        test: /\.(png|svg|jpg|jpeg|gif|ico)$/,
        type: 'asset/resource',
      },
    ],
  },
  plugins: [
    new HtmlWebpackPlugin({
      template: './src/renderer/index.html',
      filename: 'index.html',
      inject: false, // We'll manually add script tag
    }),
  ],
  resolve: {
    extensions: ['.js'],
  },
};