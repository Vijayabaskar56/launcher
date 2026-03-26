# Kvaesitso Features — React Native/Expo Ecosystem Research

> Research into which Kvaesitso launcher features can be implemented with existing packages vs which require custom native modules.

**Date:** 2026-03-24

---

## Summary

| Coverage Level           | Count | Examples                                                                                                                         |
| ------------------------ | ----- | -------------------------------------------------------------------------------------------------------------------------------- |
| **Done**                 | 35    | Search (apps, calc, contacts, calendar, wiki, location), filter bar, ranking, quick actions, backup, locale, weather, homescreen |
| **Available Package**    | 5     | Gestures, notification listener, measurement conversion, create contact action, create calendar event                            |
| **Partial / JS DIY**     | 16    | Currency, file search, website lookup, tags, hidden items, i18n, best match, custom labels, alarm/timer actions                  |
| **Custom Native Module** | 10    | Media session, icon packs, lock screen, system panels, work profile, app shortcuts                                               |

**Key insight:** The 12 custom native modules can be consolidated into **3 Expo modules**:

1. **AccessibilityService module** — lock screen, open notifications, quick settings, recents, power menu (5 features → 1 module)
2. **NotificationListener module** — notification badges, media session reading, notification actions (3 features → 1 module)
3. **Launcher module** — app list with icons, icon packs, adaptive icons, work profile, app uninstall (5 features → 1 module)

---

## Detailed Feature Matrix

### 1. THEMING & APPEARANCE

| Feature                       | Solution                                                                                           | Coverage      | Notes                                     |
| ----------------------------- | -------------------------------------------------------------------------------------------------- | ------------- | ----------------------------------------- |
| Light/Dark/System theme       | `Uniwind.setTheme()` from `uniwind`                                                                | **Done**      | Already implemented                       |
| Custom color schemes          | HeroUI Native CSS variables                                                                        | **Done**      | Already implemented (3 presets)           |
| Material You / Dynamic Colors | [`react-native-material-you-colors`](https://github.com/alabsi91/react-native-material-you-colors) | **Available** | Extracts system palette. Dev client only. |
| Theme import/export           | `expo-document-picker` + `expo-file-system` + JSON                                                 | **JS DIY**    | Serialize settings to JSON file           |
| Accent color picker           | `useThemeOverrides()` context                                                                      | **Done**      | Already implemented (14 swatches)         |
| Corner radius                 | `useThemeOverrides().cardRadius`                                                                   | **Done**      | Already wired                             |
| Font family                   | `expo-font` + Google Fonts                                                                         | **Done**      | Already wired (4 options)                 |
| Transparency                  | `useThemeOverrides().transparency`                                                                 | **Done**      | Already wired                             |

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

| Feature                          | Solution                                                                                                                                                                                        | Coverage   | Notes                                                                              |
| -------------------------------- | ----------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | ---------- | ---------------------------------------------------------------------------------- |
| List installed apps              | [`react-native-get-app-list`](https://github.com/aravind3566/react-native-get-app-list) or [`@zecky-dev/react-native-app-list`](https://www.npmjs.com/package/@zecky-dev/react-native-app-list) | **Done**   | Package names, app names, icons. Needs `QUERY_ALL_PACKAGES`. Dev client only.      |
| Launch apps                      | [`react-native-send-intent`](https://github.com/lucasferreira/react-native-send-intent) or `expo-intent-launcher`                                                                               | **Done**   | `SendIntentAndroid.openApp('com.package.name')`.                                   |
| App uninstall                    | Intent wrapper                                                                                                                                                                                  | **Done**   | `Intent.ACTION_UNINSTALL_PACKAGE`. Thin native bridge (~5 lines Kotlin).           |
| Icon shape masking               | `react-native-svg` clipPath                                                                                                                                                                     | **Done**   | Define SVG clip paths for circle, squircle, teardrop, hexagon, etc.                |
| Icon pack support (ADW/Nova)     | **Custom Native Module**                                                                                                                                                                        | **Custom** | Must query icon pack's `ContentProvider` / parse `appfilter.xml` in Kotlin.        |
| Adaptive icon extraction         | **Custom Native Module**                                                                                                                                                                        | **Custom** | `AdaptiveIconDrawable` foreground/background layers not exposed by any RN package. |
| Themed icons (Material You)      | **Custom Native Module**                                                                                                                                                                        | **Custom** | Requires `LauncherApps` + themed icon API. Part of the Launcher module.            |
| Work profile apps                | **Custom Native Module**                                                                                                                                                                        | **Custom** | `CrossProfileApps` + `LauncherApps`. No RN bridge.                                 |
| Grid layout (columns, icon size) | Pure RN (FlatList + flexbox)                                                                                                                                                                    | **Done**   | Standard layout work.                                                              |

### 4. SEARCH

#### 4a. Search Providers

| Feature                    | Solution                                                                         | Coverage    | Notes                                                                       |
| -------------------------- | -------------------------------------------------------------------------------- | ----------- | --------------------------------------------------------------------------- |
| App search                 | App list package (see above)                                                     | **Done**    | Wired with scoring + usage ranking.                                         |
| Contact search             | [`expo-contacts`](https://docs.expo.dev/versions/latest/sdk/contacts/)           | **Done**    | Soft permission prompt. Expandable inline actions.                          |
| Calendar search            | [`expo-calendar`](https://docs.expo.dev/versions/latest/sdk/calendar/)           | **Done**    | Soft permission prompt. Next 30 days.                                       |
| File search (photos/media) | [`expo-media-library`](https://docs.expo.dev/versions/latest/sdk/media-library/) | **Partial** | Photos/videos/audio only. Not documents/downloads.                          |
| File search (all files)    | **Custom module** or directory traversal                                         | **Partial** | `expo-file-system` can traverse dirs but no MediaStore query for documents. |
| Calculator                 | `mathjs` (lazy loaded)                                                           | **Done**    | Math expressions + base conversion (HEX, OCT, BIN). Copy to clipboard.      |
| Unit converter             | `mathjs` (lazy loaded)                                                           | **Done**    | Format: `5 inch to cm`. Copy to clipboard.                                  |
| Currency conversion        | Free API (exchangerate-api.com)                                                  | **JS DIY**  | Simple fetch call. Part of unit converter in Kvaesitso.                     |
| Wikipedia search           | `react-native-nitro-fetch` + MediaWiki API                                       | **Done**    | Network tier (500ms debounce). Opens in browser.                            |
| Location/place search      | `react-native-nitro-fetch` + Nominatim API                                       | **Done**    | Network tier. Opportunistic GPS bias. Opens in maps.                        |
| Website URL lookup         | `react-native-nitro-fetch` + HTML parsing                                        | **JS DIY**  | Extract title, description, favicon from URLs. Only with online filter.     |
| App shortcuts              | **Custom Native Module**                                                         | **Custom**  | `ShortcutManager` not exposed by RN packages. Part of Launcher module.      |
| Custom attributes search   | Pure RN (MMKV + local search)                                                    | **JS DIY**  | Search custom labels and tags applied to items.                             |

#### 4b. Search Actions (Quick Actions on Query)

| Feature               | Solution                               | Coverage      | Notes                                                     |
| --------------------- | -------------------------------------- | ------------- | --------------------------------------------------------- |
| Phone call action     | `expo-linking` (`tel:` URI)            | **Done**      | Trigger when query matches phone number pattern.          |
| SMS message action    | `expo-linking` (`sms:` URI)            | **Done**      | Trigger when query matches phone number pattern.          |
| Email action          | `expo-linking` (`mailto:` URI)         | **Done**      | Trigger when query matches email pattern.                 |
| Open URL action       | `expo-linking` or `expo-web-browser`   | **Done**      | Trigger when query is a valid URL.                        |
| Create contact action | `expo-contacts`                        | **Available** | Offer when query is phone/email.                          |
| Set alarm action      | `expo-intent-launcher`                 | **Partial**   | Android only. Trigger on time patterns like "8:30 AM".    |
| Start timer action    | `expo-intent-launcher`                 | **Partial**   | Android only. Trigger on timespan patterns like "5 min".  |
| Create calendar event | `expo-calendar`                        | **Available** | Trigger on date patterns.                                 |
| Web search action     | `expo-linking` (URL template)          | **Done**      | Configurable engine (Google/DuckDuckGo/Bing) in settings. |
| App search action     | `expo-intent-launcher` (ACTION_SEARCH) | **Partial**   | Android only. Launch in-app search for specific apps.     |
| Custom intent action  | `expo-intent-launcher`                 | **Partial**   | Android only. Full intent configuration.                  |

#### 4c. Search UI & Filtering

| Feature                | Solution                        | Coverage   | Notes                                                                      |
| ---------------------- | ------------------------------- | ---------- | -------------------------------------------------------------------------- |
| Filter bar             | Pure RN (horizontal ScrollView) | **Done**   | Docked above keyboard. 5 categories + globe network toggle.                |
| Filter badge indicator | Pure RN                         | **Done**   | Active filter highlighted with accent color.                               |
| Category sections      | Pure RN (SectionList)           | **Done**   | Kvaesitso section order. Auto-expand when single filter active.            |
| Best match / launch    | Pure RN                         | **JS DIY** | Highlight first result. Launch on keyboard "Go" button.                    |
| Network filter toggle  | Pure RN + MMKV                  | **Done**   | Globe icon in filter bar. Persists across sessions.                        |
| Hidden items           | Pure RN (MMKV)                  | **JS DIY** | Items can be hidden from all views. Button to show hidden items in search. |
| Custom labels          | Pure RN (MMKV)                  | **JS DIY** | Override display name for any searchable item.                             |
| Tags                   | Pure RN (MMKV)                  | **JS DIY** | Tag items, search by tag, autocomplete, bulk edit.                         |
| Item visibility levels | Pure RN (MMKV)                  | **JS DIY** | Default / SearchOnly / Hidden per item.                                    |

#### 4d. Search Ranking & Scoring

| Feature              | Solution                    | Coverage    | Notes                                                            |
| -------------------- | --------------------------- | ----------- | ---------------------------------------------------------------- |
| Text match scoring   | Pure JS (string similarity) | **Done**    | 60% text score + 40% usage weight. matchScore() + scoreResult(). |
| Usage-based ranking  | MMKV (launch counts)        | **Done**    | recordLaunch() on tap. Persisted in MMKV.                        |
| Result deduplication | Pure JS (Set by key)        | **Done**    | Deduplicate across providers by unique item key.                 |
| String normalization | Pure JS or ICU              | **Partial** | For language-specific matching (diacritics, transliteration).    |

### 5. NOTIFICATIONS & BADGES

| Feature               | Solution                                                                                                                                                                                                                                                  | Coverage      | Notes                                                                                       |
| --------------------- | --------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | ------------- | ------------------------------------------------------------------------------------------- |
| Notification listener | [`react-native-android-notification-listener`](https://github.com/leandrosimoes/react-native-android-notification-listener) or [`expo-android-notification-listener-service`](https://github.com/SeokyoungYou/expo-android-notification-listener-service) | **Available** | Bridges `NotificationListenerService`. User must grant access in Settings. Dev client only. |
| Badge counts          | Derived from notification listener                                                                                                                                                                                                                        | **Partial**   | Aggregate from notification events. No single package gives per-app counts.                 |
| Notification actions  | **Custom Native Module**                                                                                                                                                                                                                                  | **Custom**    | Executing another app's notification actions requires extending the listener.               |

### 6. GESTURES & SYSTEM ACTIONS

| Feature                  | Solution                                   | Coverage      | Notes                                                                    |
| ------------------------ | ------------------------------------------ | ------------- | ------------------------------------------------------------------------ |
| In-app gestures          | `react-native-gesture-handler` (installed) | **Available** | Swipe, tap, long-press, pan. Full coverage.                              |
| Lock screen              | **Custom Native Module**                   | **Custom**    | `DevicePolicyManager.lockNow()`. ~10 lines Kotlin.                       |
| Open notifications panel | **Custom Native Module**                   | **Custom**    | `AccessibilityService.performGlobalAction(GLOBAL_ACTION_NOTIFICATIONS)`  |
| Open quick settings      | **Custom Native Module**                   | **Custom**    | `AccessibilityService.performGlobalAction(GLOBAL_ACTION_QUICK_SETTINGS)` |
| Open recent apps         | **Custom Native Module**                   | **Custom**    | `AccessibilityService.performGlobalAction(GLOBAL_ACTION_RECENTS)`        |
| Power menu               | **Custom Native Module**                   | **Custom**    | `AccessibilityService.performGlobalAction(GLOBAL_ACTION_POWER_DIALOG)`   |

**Consolidation:** All 5 system actions (lock, notifications, quick settings, recents, power menu) can be a single **AccessibilityService Expo module** that exposes `performGlobalAction(actionId)`.

### 7. INTEGRATIONS

| Feature                  | Solution                                | Coverage   | Notes                                                |
| ------------------------ | --------------------------------------- | ---------- | ---------------------------------------------------- |
| Weather (Met.no)         | `react-native-nitro-fetch` + Met.no API | **Done**   | Free API, no key needed. Wired to weather widget.    |
| Weather (OpenWeatherMap) | Direct `fetch()`                        | **JS DIY** | Needs free API key. Falls through to Met.no for now. |
| Media session control    | **Custom Native Module**                | **Custom** | Part of NotificationListener module.                 |
| Nextcloud/Owncloud       | WebDAV client (`webdav` npm) + REST API | **JS DIY** | Standard HTTP APIs.                                  |
| Smartspacer              | **Custom Native Module**                | **Custom** | Android-specific SDK. Low priority.                  |

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

### Module 1: `expo-launcher-service`

**Covers:** App list, app icons, adaptive icons, icon packs, app shortcuts, work profile, app uninstall

**Android APIs:**

- `PackageManager` — list apps, get icons, query icon packs
- `AdaptiveIconDrawable` — extract foreground/background layers
- `LauncherApps` — work profile, themed icons
- `ShortcutManager` — static/dynamic shortcuts
- `CrossProfileApps` — work profile interaction

**Estimated effort:** Large (200-300 lines Kotlin)

### Module 2: `expo-accessibility-actions`

**Covers:** Lock screen, open notifications, open quick settings, open recents, power menu

**Android APIs:**

- `AccessibilityService.performGlobalAction()`
- `DevicePolicyManager.lockNow()`

**Estimated effort:** Small (50-80 lines Kotlin)
**User requirement:** Must enable accessibility service in Android Settings

### Module 3: `expo-notification-bridge`

**Covers:** Notification listener, badge counts, media session reading, notification actions

**Android APIs:**

- `NotificationListenerService`
- `MediaSessionManager`
- `StatusBarNotification`

**Estimated effort:** Medium (100-150 lines Kotlin)
**User requirement:** Must grant notification access in Android Settings

---

## Implementation Priority Recommendation

### Phase 1: Available packages (no native code)

Install and wire: `expo-battery`, `expo-contacts`, `expo-calendar`, `expo-screen-orientation`, `expo-document-picker`, `expo-location`, `expo-media-library`, `mathjs`

### Phase 2: JS DIY features

Build: Weather API integration, Wikipedia search, calculator, unit converter, icon shape masking, clock widgets, backup/restore

### Phase 3: Custom native modules

Build the 3 Expo modules above. Start with `expo-accessibility-actions` (smallest), then `expo-notification-bridge`, then `expo-launcher-service` (largest).

### Deprioritize

- Smartspacer integration (niche Android feature)
- Full ICU transliteration (edge case)
- Work profile support (complex, low user demand initially)
