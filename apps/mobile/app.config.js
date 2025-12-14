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
    name: isProd ? "Starter Mono" : "Starter Mono dev",
    slug: "starter-mono-mobile",
    version: "0.0.9",
    orientation: "portrait",
    icon: "./assets/images/icon.png",
    scheme: "startermono",
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
        projectId: "a03dd2a6-0203-4177-9330-880a4a87e3be" // replace with your own expo eas project id, set to undefined for first build so cli generates on for you
      },
      appVariant: variant // handy to read inside the app if needed
    },

    owner: "rjaay23"
  };
};
