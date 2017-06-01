var BrowserSyncPlugin = require('browser-sync-webpack-plugin');

module.exports = {
    entry: [__dirname + "/app/index.js", __dirname + '/node_modules/datamaps/dist/datamaps.world.js'],
    output: {
        path: __dirname,
        filename: "bundle.js"
    },
    module: {
        loaders: [
            {
              test: /\.css$/,
              loader: "style!css"
            },
            {
              test: /\.js$/,
              exclude: /node_modules/,
              loader: 'babel',
              query: {
                presets: ['es2015']
              }
            }
        ]
    },
    plugins: [
      new BrowserSyncPlugin({
        // browse to http://localhost:3000/ during development, 
        // ./public directory is being served 
        host: 'localhost',
        port: 3000,
        server: { baseDir: ['./'] }
      })
    ]
};
