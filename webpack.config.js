module.exports = {
  // Other Webpack configurations...
  module: {
    rules: [
      {
        test: /\.js$/,
        enforce: 'pre',
        use: ['source-map-loader'],
        exclude: /node_modules\/@trezor\/utils/,  // Exclude @trezor/utils from source-map-loader
      },
    ],
  },
};
