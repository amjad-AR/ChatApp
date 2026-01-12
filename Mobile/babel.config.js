module.exports = function (api) {
  api.cache(true);
  return {
    presets: [
      ["babel-preset-expo", { jsxImportSource: "nativewind" }],
    ],
    // ✅ Removed "nativewind/babel" - not needed for NativeWind v4
  };
};