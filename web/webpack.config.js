const path              = require('path');
const HtmlWebpackPlugin = require('html-webpack-plugin');

const publicPath   = path.resolve(__dirname, 'public');
const srcPath      = path.resolve(__dirname, 'src');
const buildPath    = path.resolve(__dirname, 'dist');

module.exports = {
  mode: "development",
  entry: {
    main: path.join(srcPath, 'main.ts'),
    // TODO: processor should be bundled through it's inclusion in main.ts rather than explicitly 
    // here.... hopefully that is possible
    // processor: path.join(srcPath, 'wave-table-node-processor.ts'),
    // filename: '[name].bundle.js'
  },

  

  output: {
    path: buildPath,
    publicPath: "/",
    filename: '[name].bundle.js'
  },

  module: {
    rules: [
      {
        test: /\.js$/,
        exclude: [/node_modules/, /\.worklet\.js$/],
        loader: 'babel-loader'
      },
      {
        test: /\.ts$/,
        exclude: [/node_modules/, /\.worklet\.ts$/],
        loader: 'babel-loader'
      },
      {
        test: /\.worklet\.ts$/,
        use: [{ 
          loader: 'worklet-loader',
          options: {
            // name: '[hash].worklelst.js'
            name: '[name].worklet.js'
          },
        },
          {
            loader: "babel-loader"
          }
        ],
        
      }
    ]
  },

  resolve: {
    extensions: ['*', '.js', '.ts']
  },

  devtool: 'inline-source-map',

  plugins: [
    new HtmlWebpackPlugin({
      template: path.join(publicPath , 'index.html'),
      filename: 'index.html'
    })
  ]
};
