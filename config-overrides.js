const webpack = require('webpack');

module.exports = function override(config) {
  config.resolve = {
    ...(config.resolve || {}),
    alias: {
      ...(config.resolve?.alias || {}),
      'process/browser': require.resolve('process/browser')
    },
    fallback: {
      ...(config.resolve?.fallback || {}),
      crypto: require.resolve('crypto-browserify'),
      stream: require.resolve('stream-browserify'),
      buffer: require.resolve('buffer/'),
      assert: require.resolve('assert'),
      process: require.resolve('process/browser'),
      vm: require.resolve('vm-browserify')
    }
  };

  config.plugins = [
    ...(config.plugins || []),
    new webpack.ProvidePlugin({
      Buffer: ['buffer', 'Buffer'],
      process: 'process/browser'
    })
  ];

  return config;
};

