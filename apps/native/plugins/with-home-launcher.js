/* eslint-disable unicorn/prefer-module, node/global-require -- Expo config plugins require CommonJS */
const {
  withAndroidManifest,
  withAndroidStyles,
  withDangerousMod,
} = require("expo/config-plugins");
const fs = require("node:fs");
const path = require("node:path");

const HOME_INTENT_ACTION = "android.intent.action.MAIN";
const HOME_INTENT_CATEGORIES = [
  "android.intent.category.HOME",
  "android.intent.category.DEFAULT",
];

const hasHomeIntentFilter = (intentFilters = []) =>
  intentFilters.some((intentFilter) => {
    const actions = intentFilter.action ?? [];
    const categories = intentFilter.category ?? [];

    const hasMainAction = actions.some(
      (item) => item.$["android:name"] === HOME_INTENT_ACTION
    );
    const hasCategories = HOME_INTENT_CATEGORIES.every((categoryName) =>
      categories.some((item) => item.$["android:name"] === categoryName)
    );

    return hasMainAction && hasCategories;
  });

const createHomeIntentFilter = () => ({
  action: [{ $: { "android:name": HOME_INTENT_ACTION } }],
  category: HOME_INTENT_CATEGORIES.map((categoryName) => ({
    $: { "android:name": categoryName },
  })),
});

/**
 * Inject the HOME re-launch guard into MainActivity.kt.
 * When the app is already running and the user presses HOME,
 * Android re-creates the activity. expo-dev-client crashes because
 * the React context already exists. This guard finishes the duplicate
 * activity before onCreate proceeds.
 */
const patchMainActivity = (projectRoot) => {
  const mainActivityPath = path.join(
    projectRoot,
    "android/app/src/main/java/com/anonymous/mybettertapp/MainActivity.kt"
  );

  if (!fs.existsSync(mainActivityPath)) {
    return;
  }

  let content = fs.readFileSync(mainActivityPath, "utf8");

  // Already patched
  if (content.includes("CATEGORY_HOME")) {
    return;
  }

  // Add the import
  if (!content.includes("import android.content.Intent")) {
    content = content.replace(
      "import android.os.Build",
      "import android.content.Intent\nimport android.os.Build"
    );
  }

  // Add the guard at the top of onCreate, before SplashScreenManager
  const guard = `    // Guard against HOME intent re-launch crash with expo-dev-client
    if (!isTaskRoot &&
        intent.hasCategory(Intent.CATEGORY_HOME) &&
        intent.action == Intent.ACTION_MAIN) {
      finish()
      return
    }
`;

  content = content.replace(
    "  override fun onCreate(savedInstanceState: Bundle?) {\n",
    `  override fun onCreate(savedInstanceState: Bundle?) {\n${guard}\n`
  );

  fs.writeFileSync(mainActivityPath, content, "utf8");
};

const ensureStyleItem = (itemList, name, value) => {
  const existing = itemList.find((item) => item.$?.name === name);
  if (existing) {
    existing._ = value;
    return;
  }
  itemList.push({ $: { name }, _: value });
};

const TRANSPARENT_WINDOW_ENTRIES = [
  ["android:windowBackground", "@android:color/transparent"],
  ["android:windowShowWallpaper", "true"],
  ["android:windowIsTranslucent", "true"],
];

const withHomeLauncher = (config) => {
  // 1. Add HOME intent filter to manifest
  const withManifest = withAndroidManifest(config, (nextConfig) => {
    const application = nextConfig.modResults.manifest.application?.[0];
    const activity = application?.activity?.find(
      (item) => item.$["android:name"] === ".MainActivity"
    );

    if (!activity) {
      return nextConfig;
    }

    const intentFilters = activity["intent-filter"] ?? [];

    if (!hasHomeIntentFilter(intentFilters)) {
      activity["intent-filter"] = [...intentFilters, createHomeIntentFilter()];
    }

    return nextConfig;
  });

  // 2. Set transparent window theme for wallpaper
  const withStyles = withAndroidStyles(withManifest, (nextConfig) => {
    const styles = nextConfig.modResults.resources.style ?? [];
    const appTheme = styles.find((style) => style.$.name === "AppTheme");
    const splashTheme = styles.find(
      (style) => style.$.name === "Theme.App.SplashScreen"
    );

    if (!appTheme) {
      return nextConfig;
    }

    const items = appTheme.item ?? [];
    for (const [name, value] of TRANSPARENT_WINDOW_ENTRIES) {
      ensureStyleItem(items, name, value);
    }
    appTheme.item = items;

    if (splashTheme) {
      const splashItems = splashTheme.item ?? [];
      for (const [name, value] of TRANSPARENT_WINDOW_ENTRIES) {
        ensureStyleItem(splashItems, name, value);
      }
      splashTheme.item = splashItems;
    }

    return nextConfig;
  });

  // 3. Patch MainActivity.kt with HOME re-launch guard
  return withDangerousMod(withStyles, [
    "android",
    (nextConfig) => {
      patchMainActivity(nextConfig.modRequest.projectRoot);
      return nextConfig;
    },
  ]);
};

module.exports = withHomeLauncher;
