// eslint-disable-next-line unicorn/prefer-module
const { getDefaultConfig } = require("expo/metro-config");
// eslint-disable-next-line unicorn/prefer-module
const { withUniwindConfig } = require("uniwind/metro");

// eslint-disable-next-line unicorn/prefer-module
const config = getDefaultConfig(__dirname);

// eslint-disable-next-line unicorn/prefer-module
module.exports = withUniwindConfig(config, {
  cssEntryFile: "./global.css",
  extraThemes: [
    "high-contrast-light",
    "high-contrast-dark",
    "bw-light",
    "bw-dark",
  ],
});
