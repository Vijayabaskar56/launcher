# Kvaesitso Features — React Native/Expo Ecosystem Research

> Research into which Kvaesitso launcher features can be implemented with existing packages vs which require custom native modules.

**Date:** 2026-03-24

---

## Summary

| Coverage Level           | Count | Examples                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                         |
| ------------------------ | ----- | ---------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| **Done**                 | 66    | Search (9 providers incl. currency + website URL), filter bar, ranking, quick actions (call, SMS, email, URL, create contact, set alarm, start timer, create calendar event), best match launch on Enter, backup + theme import/export, locale, weather (Met.no + OpenWeatherMap), homescreen (clock, battery, charging, system bars), gestures (6 configurable, 10 actions, directional panels, haptics), accessibility actions (lock/notifications/quick settings/recents/power menu), Material You dynamic colors, notification badges, string normalization, custom labels in search, item visibility levels |
| **Partial / JS DIY**     | 2     | Tags for search items, i18n                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                      |
| **Custom Native Module** | 4     | Media session, icon packs, adaptive icons, app shortcuts                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                         |

**Key insight:** Of the original 3 planned Expo modules, 1 is fully complete and 1 is partially done:

1. **~~AccessibilityService module~~** — **DONE** (built as `react-native-accessibility-actions` Nitro module). Lock screen, notifications, quick settings, recents, power menu all working.
2. **NotificationListener module** — **PARTIALLY DONE** (`expo-android-notification-listener-service` installed, badge counts working). Still needs: media session reading, notification actions.
3. **Launcher module** — icon packs, adaptive icons, themed icons, app shortcuts. **NOT STARTED**. Work profile dropped from scope.

---

## Detailed Feature Matrix

### 1. THEMING & APPEARANCE

| Feature                       | Solution                                           | Coverage | Notes                                                                                          |
| ----------------------------- | -------------------------------------------------- | -------- | ---------------------------------------------------------------------------------------------- |
| Light/Dark/System theme       | `Uniwind.setTheme()` from `uniwind`                | **Done** | Already implemented                                                                            |
| Custom color schemes          | HeroUI Native CSS variables                        | **Done** | Already implemented (3 presets)                                                                |
| Material You / Dynamic Colors | `react-native-material-you-colors` (installed)     | **Done** | "Material You" swatch in accent picker. Extracts system wallpaper color. Falls back to indigo. |
| Theme import/export           | `expo-document-picker` + `expo-file-system` + JSON | **Done** | Theme + full settings export/import via expo-sharing. Validation on import.                    |
| Accent color picker           | `useThemeOverrides()` context                      | **Done** | Already implemented (14 swatches)                                                              |
| Corner radius                 | `useThemeOverrides().cardRadius`                   | **Done** | Already wired                                                                                  |
| Font family                   | `expo-font` + Google Fonts                         | **Done** | Already wired (4 options)                                                                      |
| Transparency                  | `useThemeOverrides().transparency`                 | **Done** | Already wired                                                                                  |

### 2. HOMESCREEN

| Feature                 | Solution                                                                                   | Coverage     | Notes                                                                                                                                                                                                                                       |
| ----------------------- | ------------------------------------------------------------------------------------------ | ------------ | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| Wallpaper blur overlay  | `expo-blur` (BlurView)                                                                     | **Deferred** | Requires transparent Android window (`app.json` + native config) which affects entire app rendering. Must integrate with theme system (`bg-background` → semi-transparent). Tackle as own focused task after homescreen features are wired. |
| Wallpaper dim           | Theme overlay                                                                              | **Deferred** | Same prerequisite as blur — needs transparent window to see wallpaper through app.                                                                                                                                                          |
| Read system wallpaper   | **Custom module** or `expo-wallpaper-manager`                                              | **Partial**  | Most packages only SET wallpapers. Reading requires `WallpaperManager.getDrawable()`.                                                                                                                                                       |
| System bar hiding       | `expo-navigation-bar` + `expo-status-bar`                                                  | **Done**     | `setVisibilityAsync()`, `setHidden()`. Full coverage.                                                                                                                                                                                       |
| System bar colors       | `expo-navigation-bar` + `expo-status-bar`                                                  | **Done**     | `setBackgroundColorAsync()`, `setStyle()`.                                                                                                                                                                                                  |
| Screen orientation lock | [`expo-screen-orientation`](https://docs.expo.dev/versions/latest/sdk/screen-orientation/) | **Done**     | `lockAsync()`. Works in Expo Go.                                                                                                                                                                                                            |
| Clock widget (digital)  | Pure RN (`Date` + `Intl`)                                                                  | **Done**     | No package needed.                                                                                                                                                                                                                          |
| Clock widget (analog)   | `react-native-svg` + `react-native-reanimated`                                             | **Done**     | Draw with SVG, animate with Reanimated. Both installed.                                                                                                                                                                                     |
| Battery widget          | [`expo-battery`](https://docs.expo.dev/versions/latest/sdk/battery/)                       | **Done**     | `useBatteryLevel()`, `getBatteryStateAsync()`. Works in Expo Go.                                                                                                                                                                            |
| Music widget (external) | **Custom Native Module**                                                                   | **Custom**   | Reading other apps' `MediaSession` requires `MediaSessionManager` + `NotificationListenerService`. No RN package.                                                                                                                           |
| Charging animation      | `react-native-reanimated` + `expo-battery`                                                 | **Done**     | Listen to battery state changes, animate with Reanimated.                                                                                                                                                                                   |

### 3. ICONS & APP MANAGEMENT

| Feature                          | Solution                                                                                                                                                                                        | Coverage          | Notes                                                                              |
| -------------------------------- | ----------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | ----------------- | ---------------------------------------------------------------------------------- |
| List installed apps              | [`react-native-get-app-list`](https://github.com/aravind3566/react-native-get-app-list) or [`@zecky-dev/react-native-app-list`](https://www.npmjs.com/package/@zecky-dev/react-native-app-list) | **Done**          | Package names, app names, icons. Needs `QUERY_ALL_PACKAGES`. Dev client only.      |
| Launch apps                      | [`react-native-send-intent`](https://github.com/lucasferreira/react-native-send-intent) or `expo-intent-launcher`                                                                               | **Done**          | `SendIntentAndroid.openApp('com.package.name')`.                                   |
| App uninstall                    | Intent wrapper                                                                                                                                                                                  | **Done**          | `Intent.ACTION_UNINSTALL_PACKAGE`. Thin native bridge (~5 lines Kotlin).           |
| Icon shape masking               | `react-native-svg` clipPath                                                                                                                                                                     | **Done**          | Define SVG clip paths for circle, squircle, teardrop, hexagon, etc.                |
| Icon pack support (ADW/Nova)     | **Custom Native Module**                                                                                                                                                                        | **Custom**        | Must query icon pack's `ContentProvider` / parse `appfilter.xml` in Kotlin.        |
| Adaptive icon extraction         | **Custom Native Module**                                                                                                                                                                        | **Custom**        | `AdaptiveIconDrawable` foreground/background layers not exposed by any RN package. |
| Themed icons (Material You)      | **Custom Native Module**                                                                                                                                                                        | **Custom**        | Requires `LauncherApps` + themed icon API. Part of the Launcher module.            |
| Work profile apps                | **Custom Native Module**                                                                                                                                                                        | **Deprioritized** | Not planned. `CrossProfileApps` + `LauncherApps`.                                  |
| Grid layout (columns, icon size) | Pure RN (FlatList + flexbox)                                                                                                                                                                    | **Done**          | Standard layout work.                                                              |

### 4. SEARCH

#### 4a. Search Providers

| Feature                    | Solution                                                                         | Coverage    | Notes                                                                         |
| -------------------------- | -------------------------------------------------------------------------------- | ----------- | ----------------------------------------------------------------------------- |
| App search                 | App list package (see above)                                                     | **Done**    | Wired with scoring + usage ranking.                                           |
| Contact search             | [`expo-contacts`](https://docs.expo.dev/versions/latest/sdk/contacts/)           | **Done**    | Soft permission prompt. Expandable inline actions.                            |
| Calendar search            | [`expo-calendar`](https://docs.expo.dev/versions/latest/sdk/calendar/)           | **Done**    | Soft permission prompt. Next 30 days.                                         |
| File search (photos/media) | [`expo-media-library`](https://docs.expo.dev/versions/latest/sdk/media-library/) | **Partial** | Photos/videos/audio only. Not documents/downloads.                            |
| File search (all files)    | **Custom module** or directory traversal                                         | **Partial** | `expo-file-system` can traverse dirs but no MediaStore query for documents.   |
| Calculator                 | `mathjs` (lazy loaded)                                                           | **Done**    | Math expressions + base conversion (HEX, OCT, BIN). Copy to clipboard.        |
| Unit converter             | `mathjs` (lazy loaded)                                                           | **Done**    | Format: `5 inch to cm`. Copy to clipboard.                                    |
| Currency conversion        | `react-native-nitro-fetch` + exchangerate-api.com                                | **Done**    | "100 USD to EUR" pattern. 1hr cache. Network tier. Copy to clipboard.         |
| Wikipedia search           | `react-native-nitro-fetch` + MediaWiki API                                       | **Done**    | Network tier (500ms debounce). Opens in browser.                              |
| Location/place search      | `react-native-nitro-fetch` + Nominatim API                                       | **Done**    | Network tier. Opportunistic GPS bias. Opens in maps.                          |
| Website URL lookup         | `react-native-nitro-fetch` + HTML parsing                                        | **Done**    | Fetches title, description, favicon. Network tier. Opens in expo-web-browser. |
| App shortcuts              | **Custom Native Module**                                                         | **Custom**  | `ShortcutManager` not exposed by RN packages. Part of Launcher module.        |
| Custom attributes search   | Pure RN (MMKV + local search)                                                    | **Done**    | Aliases searchable in app provider. Tags still JS DIY.                        |

#### 4b. Search Actions (Quick Actions on Query)

| Feature               | Solution                               | Coverage    | Notes                                                                          |
| --------------------- | -------------------------------------- | ----------- | ------------------------------------------------------------------------------ |
| Phone call action     | `expo-linking` (`tel:` URI)            | **Done**    | Trigger when query matches phone number pattern.                               |
| SMS message action    | `expo-linking` (`sms:` URI)            | **Done**    | Trigger when query matches phone number pattern.                               |
| Email action          | `expo-linking` (`mailto:` URI)         | **Done**    | Trigger when query matches email pattern.                                      |
| Open URL action       | `expo-linking` or `expo-web-browser`   | **Done**    | Trigger when query is a valid URL.                                             |
| Create contact action | `expo-contacts`                        | **Done**    | Triggers when query matches phone/email. Opens native contact form pre-filled. |
| Set alarm action      | `expo-intent-launcher`                 | **Done**    | Android only. Triggers on "8:30 AM", "alarm 7:00". Fires `SET_ALARM` intent.   |
| Start timer action    | `expo-intent-launcher`                 | **Done**    | Android only. "5 min", "30 sec", "2h30m". Fires `SET_TIMER` intent.            |
| Create calendar event | `expo-calendar`                        | **Done**    | Triggers on "meeting tomorrow", "lunch friday". Creates event via intent/API.  |
| Web search action     | `expo-linking` (URL template)          | **Done**    | Configurable engine (Google/DuckDuckGo/Bing) in settings.                      |
| App search action     | `expo-intent-launcher` (ACTION_SEARCH) | **Partial** | Android only. Launch in-app search for specific apps.                          |
| Custom intent action  | `expo-intent-launcher`                 | **Partial** | Android only. Full intent configuration.                                       |

#### 4c. Search UI & Filtering

| Feature                | Solution                        | Coverage   | Notes                                                                            |
| ---------------------- | ------------------------------- | ---------- | -------------------------------------------------------------------------------- |
| Filter bar             | Pure RN (horizontal ScrollView) | **Done**   | Docked above keyboard. 5 categories + globe network toggle.                      |
| Filter badge indicator | Pure RN                         | **Done**   | Active filter highlighted with accent color.                                     |
| Category sections      | Pure RN (SectionList)           | **Done**   | Kvaesitso section order. Auto-expand when single filter active.                  |
| Best match / launch    | Pure RN                         | **Done**   | Enter/Go key launches first search result. Wired via `submitRef` pattern.        |
| Network filter toggle  | Pure RN + MMKV                  | **Done**   | Globe icon in filter bar. Persists across sessions.                              |
| Hidden items           | Pure RN (MMKV)                  | **Done**   | "Show Hidden Apps" button in drawer. Modal lists hidden apps with tap to unhide. |
| Custom labels          | Pure RN (MMKV)                  | **Done**   | Aliases match in app search. Alias shown as title, original as subtitle.         |
| Tags                   | Pure RN (MMKV)                  | **JS DIY** | Tag items, search by tag, autocomplete, bulk edit.                               |
| Item visibility levels | Pure RN (MMKV)                  | **Done**   | Default/SearchOnly/Hidden per app. UI in edit sheet. Filters drawer + search.    |

#### 4d. Search Ranking & Scoring

| Feature              | Solution                    | Coverage | Notes                                                              |
| -------------------- | --------------------------- | -------- | ------------------------------------------------------------------ |
| Text match scoring   | Pure JS (string similarity) | **Done** | 60% text score + 40% usage weight. matchScore() + scoreResult().   |
| Usage-based ranking  | MMKV (launch counts)        | **Done** | recordLaunch() on tap. Persisted in MMKV.                          |
| Result deduplication | Pure JS (Set by key)        | **Done** | Deduplicate across providers by unique item key.                   |
| String normalization | Pure JS (NFD + regex)       | **Done** | Diacritics stripping via normalizeText(). Applied in matchScore(). |

### 5. NOTIFICATIONS & BADGES

| Feature               | Solution                                                 | Coverage   | Notes                                                                                     |
| --------------------- | -------------------------------------------------------- | ---------- | ----------------------------------------------------------------------------------------- |
| Notification listener | `expo-android-notification-listener-service` (installed) | **Done**   | Bridges `NotificationListenerService`. User must grant Notification Access in Settings.   |
| Badge counts          | Derived from notification listener                       | **Done**   | `context/notification-badges.tsx` aggregates per-package counts. Badge dots on app icons. |
| Notification actions  | **Custom Native Module**                                 | **Custom** | Executing another app's notification actions requires extending the listener.             |

### 6. GESTURES & SYSTEM ACTIONS

| Feature                  | Solution                                            | Coverage | Notes                                                                                                                                                                                                               |
| ------------------------ | --------------------------------------------------- | -------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| In-app gestures          | `react-native-gesture-handler` (installed)          | **Done** | 6 configurable gestures (swipe up/down/left/right, double tap, long press), 10 actions, directional panel animations, rubberband threshold, haptic feedback. Kvaesitso-style settings UI with action picker dialog. |
| Lock screen              | `react-native-accessibility-actions` (Nitro module) | **Done** | Built as local Nitro module. Uses `AccessibilityService.GLOBAL_ACTION_LOCK_SCREEN`.                                                                                                                                 |
| Open notifications panel | `react-native-accessibility-actions` (Nitro module) | **Done** | `AccessibilityService.performGlobalAction(GLOBAL_ACTION_NOTIFICATIONS)`                                                                                                                                             |
| Open quick settings      | `react-native-accessibility-actions` (Nitro module) | **Done** | `AccessibilityService.performGlobalAction(GLOBAL_ACTION_QUICK_SETTINGS)`                                                                                                                                            |
| Open recent apps         | `react-native-accessibility-actions` (Nitro module) | **Done** | `AccessibilityService.performGlobalAction(GLOBAL_ACTION_RECENTS)`                                                                                                                                                   |
| Power menu               | `react-native-accessibility-actions` (Nitro module) | **Done** | `AccessibilityService.performGlobalAction(GLOBAL_ACTION_POWER_DIALOG)`                                                                                                                                              |

**Consolidation:** All 5 system actions are implemented in `packages/react-native-accessibility-actions` — a Nitro module (~80 lines Kotlin) with `HybridAccessibilityActions` exposing 7 methods including `isAccessibilityEnabled` and `openAccessibilitySettings()`.

### 7. INTEGRATIONS

| Feature                  | Solution                                | Coverage          | Notes                                                                       |
| ------------------------ | --------------------------------------- | ----------------- | --------------------------------------------------------------------------- |
| Weather (Met.no)         | `react-native-nitro-fetch` + Met.no API | **Done**          | Free API, no key needed. Wired to weather widget.                           |
| Weather (OpenWeatherMap) | `react-native-nitro-fetch` + OWM API    | **Done**          | API key input in settings. Selector: OWM/Met.no/None. Falls back to Met.no. |
| Media session control    | **Custom Native Module**                | **Custom**        | Part of NotificationListener module.                                        |
| Nextcloud/Owncloud       | WebDAV client (`webdav` npm) + REST API | **Deprioritized** | Not planned.                                                                |
| Smartspacer              | **Custom Native Module**                | **Custom**        | Android-specific SDK. Low priority.                                         |

### 8. BACKUP & DATA

| Feature              | Solution                                                                             | Coverage | Notes                                  |
| -------------------- | ------------------------------------------------------------------------------------ | -------- | -------------------------------------- |
| File picker          | [`expo-document-picker`](https://docs.expo.dev/versions/latest/sdk/document-picker/) | **Done** | Full SAF support. Works in Expo Go.    |
| Export settings JSON | `expo-file-system` + `expo-sharing`                                                  | **Done** | Write JSON, share via system sheet.    |
| Import settings JSON | `expo-document-picker` + `expo-file-system`                                          | **Done** | Pick file, read JSON, merge into MMKV. |
| MMKV storage         | `react-native-mmkv` (installed)                                                      | **Done** | Already in deps.                       |

### 9. LOCALE

| Feature                    | Solution                                                                                   | Coverage      | Notes                                                                                                                                                                                         |
| -------------------------- | ------------------------------------------------------------------------------------------ | ------------- | --------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| Locale detection           | [`expo-localization`](https://docs.expo.dev/versions/latest/sdk/localization/)             | **Done**      | Detect language, region, measurement system, calendar.                                                                                                                                        |
| UI text translation (i18n) | [`i18next`](https://www.i18next.com/) + `react-i18next` or [`lingui`](https://lingui.dev/) | **JS DIY**    | Requires i18n library, per-language JSON translation files, replacing all hardcoded strings with `t()` calls, and a language selector in settings. Significant effort — touches every screen. |
| ICU calendar systems       | `Intl.DateTimeFormat` + polyfills                                                          | **Partial**   | Hermes supports basic `Intl` but may need `@formatjs/intl-datetimeformat` for non-Gregorian calendars.                                                                                        |
| Transliteration (full ICU) | **Custom Native Module**                                                                   | **Custom**    | ICU4J `Transliterator` on Android. JS alternatives only cover Latin.                                                                                                                          |
| Measurement conversion     | `mathjs` + `expo-localization`                                                             | **Available** | Detect locale system, convert with mathjs.                                                                                                                                                    |

---

## Custom Native Modules to Build (3 Expo Modules)

### Module 1: `launcher-service` (Nitro module)

**Covers:** Adaptive icons, icon packs, app shortcuts, themed icons

**Android APIs:**

- `PackageManager` — query icon packs
- `AdaptiveIconDrawable` — extract foreground/background layers
- `LauncherApps` — themed icons
- `ShortcutManager` — static/dynamic shortcuts

**Estimated effort:** Large (200-300 lines Kotlin)
**Note:** Work profile (`CrossProfileApps`) dropped from scope.

### ~~Module 2: `expo-accessibility-actions`~~ — DONE

Built as `react-native-accessibility-actions` Nitro module in `packages/react-native-accessibility-actions/`.
~80 lines Kotlin. Exposes 7 methods via `HybridAccessibilityActions`.

### Module 3: `notification-bridge` (Nitro module)

**Covers:** Media session reading, notification actions (badge counts already done via `expo-android-notification-listener-service`)

**Android APIs:**

- `MediaSessionManager` — read active media sessions
- `StatusBarNotification` — execute notification actions

**Estimated effort:** Medium (100-150 lines Kotlin)
**User requirement:** Notification access already granted for badge counts

---

## Implementation Priority Recommendation

### ~~Phase 1: Available packages~~ — COMPLETE

All available-package features are implemented: `expo-battery`, `expo-contacts`, `expo-calendar`, `expo-screen-orientation`, `expo-document-picker`, `expo-haptics`, `react-native-material-you-colors`, `expo-android-notification-listener-service`.

### ~~Phase 2: Core JS DIY features~~ — COMPLETE

Done: Weather API (Met.no), Wikipedia search, calculator, unit converter, icon shape masking, clock widgets (digital + analog), backup/restore, search quick actions (call, SMS, email, URL, create contact, set alarm, create calendar event), best match launch on Enter, gesture system with directional panels.

### ~~Phase 3: Remaining JS DIY features~~ — COMPLETE

Done: Currency conversion, website URL lookup, custom labels in search, item visibility levels, hidden items toggle with unhide modal, theme import/export, string normalization, OpenWeatherMap provider, start timer action.

Remaining: Tags for search items (medium), i18n (large effort).

### Phase 4: Custom native modules

Build the remaining modules as Nitro modules (same pattern as `react-native-accessibility-actions`):

1. ~~`expo-accessibility-actions`~~ — **DONE** (built as `react-native-accessibility-actions` Nitro module)
2. `notification-bridge` — Extend notification listener with media session reading + notification actions (~100-150 lines Kotlin)
3. `launcher-service` — Icon packs, adaptive icons, themed icons, app shortcuts (~200-300 lines Kotlin)

### Not Planned

- Work profile support — deprioritized (complex, low user demand)
- Nextcloud/Owncloud integration — deprioritized
- Smartspacer integration — niche Android feature
- Full ICU transliteration — edge case
