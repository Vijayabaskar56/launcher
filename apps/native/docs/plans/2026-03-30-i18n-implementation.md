# i18n Implementation Plan

> **For Codex/Claude:** Implement this plan task-by-task. Each task should be committed separately.
>
> - `building-native-ui` for expo-localization integration
> - `vercel-react-best-practices` for hook design, context patterns

**Goal:** Add full internationalization support using `i18next` + `react-i18next`. Ship 10 languages (English + Spanish, French, German, Portuguese, Chinese Simplified, Japanese, Korean, Arabic, Hindi). Auto-detect system locale with manual override in Settings → Locale.

**Architecture:** `i18next` initialized in `lib/i18n.ts`, wrapped in `I18nextProvider` at the root layout. All hardcoded strings replaced with `t('namespace:key')` calls via the `useTranslation()` hook. Translation files stored as JSON in `locales/{lang}.json`. Language preference stored in MMKV settings.

---

### Product Decisions Locked

- **Library:** `i18next` + `react-i18next`
- **Languages:** en, es, fr, de, pt, zh, ja, ko, ar, hi
- **Detection:** Auto-detect from `expo-localization` on first launch, stored in settings
- **Override:** Manual language picker in Settings → Locale
- **Translations:** AI-generated for v1, can be improved later
- **RTL:** Arabic support via `I18nManager.forceRTL()` when Arabic is selected
- **Namespaces:** Single flat namespace (all keys in one file per language)
- **Fallback:** English for missing translations
- **Interpolation:** `{{count}}`, `{{name}}`, etc. for dynamic values
- **~350 strings** across 17 logical groups

---

### Packages to Install

```bash
bun add --cwd apps/native i18next react-i18next
```

No polyfills needed — Hermes supports `Intl.PluralRules` in Expo SDK 55.

---

### Task 1: Install i18next and Create Translation Infrastructure

**Files:**

- Modify: `apps/native/package.json`
- Create: `apps/native/lib/i18n.ts`
- Create: `apps/native/locales/en.json`

**Step 1: Install packages**

```bash
bun add --cwd apps/native i18next react-i18next
```

**Step 2: Create `lib/i18n.ts`**

```ts
import * as Localization from "expo-localization";
import i18n from "i18next";
import { initReactI18next } from "react-i18next";

import en from "@/locales/en.json";
import ar from "@/locales/ar.json";
import de from "@/locales/de.json";
import es from "@/locales/es.json";
import fr from "@/locales/fr.json";
import hi from "@/locales/hi.json";
import ja from "@/locales/ja.json";
import ko from "@/locales/ko.json";
import pt from "@/locales/pt.json";
import zh from "@/locales/zh.json";

const resources = {
  ar: { translation: ar },
  de: { translation: de },
  en: { translation: en },
  es: { translation: es },
  fr: { translation: fr },
  hi: { translation: hi },
  ja: { translation: ja },
  ko: { translation: ko },
  pt: { translation: pt },
  zh: { translation: zh },
};

const SUPPORTED_LANGUAGES = [
  "en",
  "es",
  "fr",
  "de",
  "pt",
  "zh",
  "ja",
  "ko",
  "ar",
  "hi",
];

const getInitialLanguage = (savedLanguage?: string): string => {
  if (savedLanguage && SUPPORTED_LANGUAGES.includes(savedLanguage)) {
    return savedLanguage;
  }
  const deviceLocale = Localization.getLocales()[0]?.languageCode ?? "en";
  return SUPPORTED_LANGUAGES.includes(deviceLocale) ? deviceLocale : "en";
};

export const initI18n = (savedLanguage?: string) => {
  i18n.use(initReactI18next).init({
    resources,
    lng: getInitialLanguage(savedLanguage),
    fallbackLng: "en",
    interpolation: { escapeValue: false },
    compatibilityJSON: "v4",
  });
  return i18n;
};

export const LANGUAGE_OPTIONS = [
  { code: "en", label: "English", nativeLabel: "English" },
  { code: "es", label: "Spanish", nativeLabel: "Español" },
  { code: "fr", label: "French", nativeLabel: "Français" },
  { code: "de", label: "German", nativeLabel: "Deutsch" },
  { code: "pt", label: "Portuguese", nativeLabel: "Português" },
  { code: "zh", label: "Chinese", nativeLabel: "中文" },
  { code: "ja", label: "Japanese", nativeLabel: "日本語" },
  { code: "ko", label: "Korean", nativeLabel: "한국어" },
  { code: "ar", label: "Arabic", nativeLabel: "العربية" },
  { code: "hi", label: "Hindi", nativeLabel: "हिन्दी" },
];

export { i18n, SUPPORTED_LANGUAGES };
```

**Step 3: Create `locales/en.json`**

Complete English translation file with all ~350 keys organized flat:

```json
{
  "common.cancel": "Cancel",
  "common.save": "Save",
  "common.ok": "OK",
  ...
  "settings.title": "Settings",
  "settings.appearance.title": "Appearance",
  ...
}
```

Use dot-notation keys for organization (e.g., `"settings.appearance.title"`) — i18next handles these naturally.

**Step 4: Commit**

```
feat: add i18n infrastructure with i18next and English translation file
```

---

### Task 2: Generate Translation Files for 9 Languages

**Files:**

- Create: `apps/native/locales/es.json`
- Create: `apps/native/locales/fr.json`
- Create: `apps/native/locales/de.json`
- Create: `apps/native/locales/pt.json`
- Create: `apps/native/locales/zh.json`
- Create: `apps/native/locales/ja.json`
- Create: `apps/native/locales/ko.json`
- Create: `apps/native/locales/ar.json`
- Create: `apps/native/locales/hi.json`

**Step 1: Generate all 9 translation files**

Use AI to translate the complete `en.json` into each language. Each file has the same keys with translated values. Preserve interpolation variables like `{{count}}`, `{{name}}`, `{{number}}`.

**Step 2: Commit**

```
feat: add AI-generated translations for 9 languages
```

---

### Task 3: Wire i18n Provider into App Layout

**Files:**

- Modify: `apps/native/app/_layout.tsx`
- Modify: `apps/native/types/settings.ts`
- Modify: `apps/native/context/settings.tsx`

**Step 1: Add `language` to LocaleSettings**

In `types/settings.ts`, add:

```ts
export interface LocaleSettings {
  language: string; // "en", "es", "fr", etc. or "system"
  timeFormat: TimeFormat;
  // ...
}
```

Default: `"system"` (auto-detect from device).

**Step 2: Initialize i18n in `_layout.tsx`**

```tsx
import { initI18n } from "@/lib/i18n";

// Inside RootLayout, before providers:
const settings = getSettings(); // read from MMKV directly
const savedLanguage =
  settings.locale.language === "system" ? undefined : settings.locale.language;
initI18n(savedLanguage);
```

**Step 3: Commit**

```
feat: wire i18n provider into app root layout
```

---

### Task 4: Add Language Picker to Locale Settings

**Files:**

- Modify: `apps/native/app/settings/locale.tsx`

**Step 1: Add language selector**

Add a language picker section at the top of the locale settings screen. Show each language with its native label (e.g., "Español", "Français", "中文"). Include a "System" option that auto-detects.

When the user selects a language:

1. Update settings via `updateLocale({ language: code })`
2. Call `i18n.changeLanguage(code)` to switch immediately
3. For Arabic: call `I18nManager.forceRTL(true)` and restart
4. For non-Arabic when currently RTL: call `I18nManager.forceRTL(false)` and restart

**Step 2: Commit**

```
feat: add language picker to locale settings
```

---

### Task 5: Replace Hardcoded Strings — Settings Screens

**Files:**

- Modify: `apps/native/app/settings/index.tsx`
- Modify: `apps/native/app/settings/appearance.tsx`
- Modify: `apps/native/app/settings/homescreen.tsx`
- Modify: `apps/native/app/settings/icons.tsx`
- Modify: `apps/native/app/settings/search.tsx`
- Modify: `apps/native/app/settings/gestures.tsx`
- Modify: `apps/native/app/settings/integrations.tsx`
- Modify: `apps/native/app/settings/locale.tsx`
- Modify: `apps/native/app/settings/backup.tsx`

**Step 1: Add `useTranslation` to each settings screen**

```tsx
import { useTranslation } from "react-i18next";

const { t } = useTranslation();

// Replace: <Text>Settings</Text>
// With:    <Text>{t("settings.title")}</Text>
```

Replace ALL hardcoded strings in settings screens with `t()` calls.

**Step 2: Commit**

```
feat: i18n all settings screens
```

---

### Task 6: Replace Hardcoded Strings — App Drawer & Search

**Files:**

- Modify: `apps/native/components/app-drawer.tsx`
- Modify: `apps/native/components/app-drawer/edit-sheet.tsx`
- Modify: `apps/native/components/app-drawer/action-menu.tsx`
- Modify: `apps/native/components/search-bar.tsx`
- Modify: `apps/native/components/search/search-results-list.tsx`
- Modify: `apps/native/types/search.ts` (section labels)
- Modify: `apps/native/lib/search-actions.ts` (action labels)
- Modify: `apps/native/lib/gesture-actions.ts` (action labels)

**Step 1: Replace all hardcoded strings**

Key areas:

- Drawer section headers ("Favorites", "Pinned apps", "All apps")
- Empty state messages
- Hidden apps modal
- Search filter labels
- Search section labels (in `SECTION_LABELS`)
- Search action labels ("Call", "SMS", "Email", "Set Alarm", etc.)
- Gesture action labels (in `GESTURE_ACTION_LABELS`)
- Action menu items ("Rename", "Tags", etc.)
- Edit sheet labels

**Note:** `SECTION_LABELS` and `GESTURE_ACTION_LABELS` are static `Record` objects. Convert them to functions that read from `i18n.t()` at call time, or use `t()` at the render site.

**Step 2: Commit**

```
feat: i18n app drawer, search, and gesture labels
```

---

### Task 7: Replace Hardcoded Strings — Homescreen, Widgets, Alerts

**Files:**

- Modify: `apps/native/app/index.tsx` (Alert.alert messages)
- Modify: `apps/native/components/clock-display.tsx`
- Modify: `apps/native/components/widgets/weather-widget.tsx`
- Modify: `apps/native/components/widgets/battery-widget.tsx`
- Modify: `apps/native/components/widgets/calendar-widget.tsx`
- Modify: `apps/native/components/widget-panel.tsx`
- Modify: `apps/native/components/settings/gesture-action-sheet.tsx`
- Modify: `apps/native/components/settings/app-picker-sheet.tsx`

**Step 1: Replace remaining strings**

Key areas:

- Accessibility service alerts ("Lock Screen", "Enable the Accessibility Service...")
- Widget labels ("Weather", "My Widgets", "Edit Widgets")
- Battery states ("Charging", "On Battery", "Full")
- Calendar day abbreviations
- Popup menu items ("Wallpaper", "Settings", "Help")
- Gesture action sheet title and option labels
- App picker sheet title and search placeholder

**Step 2: Commit**

```
feat: i18n homescreen, widgets, and alert dialogs
```

---

### Task 8: Handle RTL for Arabic

**Files:**

- Modify: `apps/native/app/_layout.tsx`
- Modify: `apps/native/lib/i18n.ts`

**Step 1: Add RTL handling**

When Arabic is selected, enable RTL:

```ts
import { I18nManager } from "react-native";
import * as Updates from "expo-updates";

const applyRTL = (language: string) => {
  const isRTL = language === "ar";
  if (I18nManager.isRTL !== isRTL) {
    I18nManager.forceRTL(isRTL);
    // Requires app restart for RTL to take effect
    Updates.reloadAsync();
  }
};
```

**Step 2: Commit**

```
feat: add RTL support for Arabic language
```

---

### Task 9: Validate i18n

**Step 1: Switch to each language in settings and verify:**

- Settings screens show translated text
- Search placeholder, filter labels, section labels are translated
- Gesture action labels are translated
- Widget labels are translated
- Alert dialogs show translated messages
- Drawer section headers are translated

**Step 2: Switch to Arabic and verify:**

- Layout flips to RTL
- Text alignment is correct
- Scrollable areas work in RTL

**Step 3: Set language to "System" and verify:**

- App follows device locale
- Falls back to English for unsupported locales

---

### Acceptance Criteria

- `i18next` + `react-i18next` installed and initialized
- 10 language JSON files (en, es, fr, de, pt, zh, ja, ko, ar, hi)
- ~350 strings extracted and translated
- Language picker in Settings → Locale with native labels
- "System" option auto-detects from device
- Arabic triggers RTL layout
- All settings screens, drawer, search, widgets, alerts use `t()`
- Fallback to English for missing translations
- No hardcoded user-facing English strings remaining
- Run `bun x ultracite fix` before each commit

---

### Implementation Notes

- Import translations statically (not lazy-loaded) since they're small JSON files (~5-10KB each)
- Use `t("key", { count: n })` for plurals — i18next handles plural rules per locale
- Use `t("key", { name: value })` for interpolation
- `SECTION_LABELS` and `GESTURE_ACTION_LABELS` should become functions: `getSectionLabel(type)` → `t(\`search.section.${type}\`)`
- For date/time formatting, keep using `Intl.DateTimeFormat` with the active locale — don't translate date strings manually
- The `en.json` file is the source of truth — all other language files must have the same keys
