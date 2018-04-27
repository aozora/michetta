exports.applyUserWebpackConfig = function (userConfig, config, isServer) {
  const merge = require('webpack-merge');
  if (typeof userConfig === 'object') {
    return merge(config, userConfig);
  }

  if (typeof userConfig === 'function') {
    const res = userConfig(config, isServer);
    if (res && typeof res === 'object') {
      return merge(config, res);
    }
  }
  return config;
};
