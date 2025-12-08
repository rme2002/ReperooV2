// app.config.js
export default ({ config }) => {
  // APP_VARIANT comes from EAS / CI: "dev" or "prd"
  const variant = process.env.APP_VARIANT || "dev";
  const isProd = variant === "prd";

  // Base identifier from your original app.json
  const baseId = "com.rjaay23.startermono";

  return {
    // start from Expo's defaults
    ...config,

    // ----- generic app settings -----
    name: isProd ? "Starter" : "Starter dev",
    slug: "mobile",
    version: "0.0.9",
    orientation: "portrait",
    icon: "./assets/images/icon.png",
    scheme: "mobile",
    userInterfaceStyle: "automatic",
    newArchEnabled: true,

    splash: {
      image: "./assets/images/splash-icon.png",
      resizeMode: "contain",
      backgroundColor: "#ffffff"
    },

    // ----- iOS -----
    ios: {
      ...(config.ios || {}),
      supportsTablet: true,
      infoPlist: {
        ITSAppUsesNonExemptEncryption: false
      },
      // prod: com.anonymous.mobile
      // dev:  com.anonymous.mobile.dev  (so you *can* install both later)
      bundleIdentifier: isProd ? baseId : `${baseId}.dev`
    },

    // ----- Android -----
    android: {
      ...(config.android || {}),
      package: isProd ? baseId : `${baseId}.dev`,
      adaptiveIcon: {
        foregroundImage: "./assets/images/adaptive-icon.png",
        backgroundColor: "#ffffff"
      },
      edgeToEdgeEnabled: true,
      predictiveBackGestureEnabled: false
    },

    // ----- Web -----
    web: {
      bundler: "metro",
      output: "static",
      favicon: "./assets/images/favicon.png"
    },

    // ----- Plugins / experiments -----
    plugins: ["expo-router"],
    experiments: {
      typedRoutes: true
    },

    // ----- Extra (keep your EAS project ID) -----
    extra: {
      ...(config.extra || {}),
      router: {},
      eas: {
        projectId: "61f3bcf4-6efc-4be7-87a9-ff4dfdffa6f2"
      },
      appVariant: variant // handy to read inside the app if needed
    },

    owner: "rjaay23"
  };
};
