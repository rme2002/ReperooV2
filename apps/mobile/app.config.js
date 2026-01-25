// app.config.js
export default ({ config }) => {
  // APP_VARIANT comes from EAS / CI: "dev" or "prd"
  const variant = process.env.APP_VARIANT || "dev";
  const isProd = variant === "prd";

  // Base identifier from your original app.json
  const baseId = "com.reperoo.app";

  return {
    // start from Expo's defaults
    ...config,

    // ----- generic app settings -----
    name: isProd ? "Reperoo" : "Reperoo Dev",
    slug: "mobile",
    version: "1.0.1",
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
        projectId: "a9fc8903-843b-4386-beb9-fdb62771973a"
      },
      appVariant: variant // handy to read inside the app if needed
    },

    owner: "rme2002"
  };
};
