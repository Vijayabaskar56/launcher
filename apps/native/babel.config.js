// eslint-disable-next-line unicorn/prefer-module, unicorn/no-anonymous-default-export
module.exports = (api) => {
  api.cache(true);
  const plugins = ["react-native-worklets/plugin"];

  return {
    plugins,

    presets: ["babel-preset-expo"],
  };
};
