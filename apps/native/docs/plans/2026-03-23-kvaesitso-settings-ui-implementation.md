# Kvaesitso-Style Settings UI Implementation Plan

> **For Codex/Claude:** Implement this plan task-by-task. Use the named skills exactly where called out per each task.

**Goal:** Build a comprehensive settings UI matching Kvaesitso's settings structure with 11 categories, using hierarchical Expo Router navigation, HeroUI Native components, and MMKV storage.

**Reference Direction:** Match Kvaesitso's settings organization:

- Main settings page: List of 11 category items with icons, titles, and summaries
- Each category: Dedicated sub-page with its own settings
- Navigation: Stack navigator with drill-down into each category
- Components: Reusable preference components (PreferenceRow, Switch, Slider, Checkbox, Select, Text)
- Data: Comprehensive TypeScript interfaces mirroring Kvaesitso's LauncherSettingsData

**Architecture:** Hierarchical Expo Router stack with dedicated route files for each category. Central settings context with MMKV persistence. Reusable preference component library.

**Tech Stack:** Expo Router, React Native, react-native-mmkv, react-native-unistyles v3, heroui-native, @expo/vector-icons

---

### Product Decisions Locked

- **Navigation**: Hierarchical with dedicated routes (`/settings`, `/settings/appearance`, etc.)
- **Input Types**: All 6 preference types (PreferenceRow, Switch, Slider, Checkbox, Select, Text)
- **Icons**: Use @expo/vector-icons/MaterialIcons directly
- **Storage**: MMKV (react-native-mmkv v4)
- **Data Structure**: Comprehensive TypeScript interfaces mirroring all Kvaesitso settings
- **Categories (11)**: Appearance, Homescreen, Icons, Search, Gestures, Integrations, Plugins, Locale, Backup, Debug, About

---

### Task 1: Install MMKV and Create Settings Types

**Required skills:** `vercel-react-best-practices`, `react-native-unistyles-v3`

**Files:**

- Modify: `apps/native/package.json`
- Create: `apps/native/types/settings.ts`

**Step 1: Install react-native-mmkv**

Add `react-native-mmkv` to dependencies:

```bash
bun add react-native-mmkv
```

**Step 2: Create comprehensive settings interfaces**

Create `types/settings.ts` mirroring Kvaesitso's `LauncherSettingsData`:

- Theme settings (ColorScheme, light/dark/system)
- UI settings (grid columns, icon size, labels, list view)
- Search settings (providers, filters, ranking)
- Homescreen settings (dock, widgets, search bar, wallpaper, system bars)
- Icon settings (shape, themed icons, icon packs)
- Gesture settings (swipe actions, taps)
- Integration settings (weather, calendar, media, files, contacts)
- Locale settings (time format, measurement system, calendars)
- Badge settings (notifications, suspended apps)
- And more...

---

### Task 2: Create MMKV Storage Utility

**Required skills:** `vercel-react-best-practices`, `react-native-unistyles-v3`

**Files:**

- Create: `apps/native/lib/storage.ts`

**Step 1: Create MMKV storage instance**

Use v4 API: `createMMKV({ id: 'settings' })`

**Step 2: Create storage helpers**

- `getSettings<T>(key: string, defaultValue: T): T`
- `setSettings<T>(key: string, value: T): void`
- Create typed setters/getters for each settings category

**Step 3: Handle initial load**

- Check if settings exist, if not use defaults
- Provide migration path for future schema changes

---

### Task 3: Create Central Settings Provider Context

**Required skills:** `vercel-react-best-practices`, `vercel-composition-patterns`, `react-native-unistyles-v3`

**Files:**

- Create: `apps/native/context/settings.tsx`

**Step 1: Create SettingsContext**

Provide:

- `state`: All settings values
- `actions`: Setters for each setting category
- `resolvedTheme`: Resolved theme (light/dark)

**Step 2: Implement state management**

- Use MMKV for persistence (load on mount, save on change)
- Provide derived values where needed
- Handle theme resolution

**Step 3: Update root layout**

- Modify: `apps/native/app/_layout.tsx`
- Wrap app with `SettingsProvider`

---

### Task 4: Create Preference Components Library

**Required skills:** `heroui-native`, `building-native-ui`, `react-native-unistyles-v3`

**Files:**

- Create: `apps/native/components/settings/preference-category.tsx`
- Create: `apps/native/components/settings/preference-row.tsx`
- Create: `apps/native/components/settings/switch-preference.tsx`
- Create: `apps/native/components/settings/slider-preference.tsx`
- Create: `apps/native/components/settings/checkbox-preference.tsx`
- Create: `apps/native/components/settings/select-preference.tsx`
- Create: `apps/native/components/settings/text-preference.tsx`

**Step 1: Create PreferenceCategory**

Section header with kicker text style:

- Uppercase kicker text
- Optional description
- Consistent spacing

**Step 2: Create PreferenceRow**

Clickable navigation row:

- Icon (MaterialIcons)
- Title and optional summary
- Chevron on right
- OnPress handler

**Step 3: Create SwitchPreference**

Toggle row using HeroUI Switch:

- Icon, title, summary
- Switch control on right
- onValueChange handler

**Step 4: Create SliderPreference**

Number range input:

- Label with current value display
- HeroUI Slider component
- Min/max/step configuration

**Step 5: Create CheckboxPreference**

Multiple selection:

- Icon, title, description
- HeroUI Checkbox
- onValueChange handler

**Step 6: Create SelectPreference**

Single selection:

- Icon, title, current value display
- HeroUI Select (bottom sheet or popover)
- Options array with labels and values

**Step 7: Create TextPreference**

Text input:

- Icon, title
- HeroUI Input
- onChangeText handler

---

### Task 5: Create Settings Stack Layout

**Required skills:** `building-native-ui`, `expo-router` (use building-native-ui references)

**Files:**

- Create: `apps/native/app/settings/_layout.tsx`

**Step 1: Create stack navigator**

- Use `Stack` from 'expo-router'
- Configure header options
- Set up all category routes

**Step 2: Add nested screens**

- `/settings` - Main settings list
- `/settings/appearance`
- `/settings/homescreen`
- `/settings/icons`
- `/settings/search`
- `/settings/gestures`
- `/settings/integrations`
- `/settings/plugins`
- `/settings/locale`
- `/settings/backup`
- `/settings/debug`
- `/settings/about`

---

### Task 6: Build Main Settings List Page

**Required skills:** `building-native-ui`, `react-native-unistyles-v3`, `vercel-react-native-skills`

**Files:**

- Modify: `apps/native/app/settings/index.tsx` (replace existing settings.tsx)

**Step 1: Create category list**

Render 11 PreferenceRow items:

1. Appearance - Theme, colors, typography, shapes
2. Homescreen - Dock, widgets, search bar, wallpaper
3. Icons - Shape, themed icons, icon packs
4. Search - Providers, filters, ranking
5. Gestures - Swipe actions, taps
6. Integrations - Weather, calendar, media
7. Plugins - Plugin management
8. Locale - Language, time format
9. Backup - Import/export settings
10. Debug - Debug options
11. About - App info, licenses

**Step 2: Use icons from MaterialIcons**

Map each category to appropriate icon.

**Step 3: Style consistently**

- Match existing app styling
- Use theme colors and spacing

---

### Task 7: Build Appearance Settings Page

**Required skills:** `building-native-ui`, `heroui-native`, `react-native-unistyles-v3`

**Files:**

- Create: `apps/native/app/settings/appearance.tsx`

**Settings:**

- Theme (Light/Dark/System)
- Color Schemes
- Typography
- Shapes
- Transparencies
- Import/Export theme

**Step 1: Theme selector**

Use Chip group or Select for theme mode.

**Step 2: Sub-navigation items**

Each sub-setting navigates to its own placeholder or detail page.

---

### Task 8: Build Homescreen Settings Page

**Required skills:** `building-native-ui`, `heroui-native`, `react-native-unistyles-v3`

**Files:**

- Create: `apps/native/app/settings/homescreen.tsx`

**Settings:**

- Fixed rotation toggle
- Dock toggle and row count
- Widgets toggle
- Search bar style (Transparent/Solid/Hidden)
- Search bar position (Top/Bottom)
- Fixed search bar toggle
- Wallpaper dim toggle
- Wallpaper blur toggle and radius
- Status bar icon color
- Navigation bar icon color
- Hide status bar toggle
- Hide navigation bar toggle
- Charging animation toggle

---

### Task 9: Build Icons Settings Page

**Required skills:** `building-native-ui`, `heroui-native`, `react-native-unistyles-v3`

**Files:**

- Create: `apps/native/app/settings/icons.tsx`

**Settings:**

- Icon shape (Circle, Square, Rounded, etc.)
- Themed icons toggle
- Force themed icons toggle
- Adaptify toggle
- Icon pack selection

---

### Task 10: Build Search Settings Page

**Required skills:** `building-native-ui`, `heroui-native`, `react-native-unistyles-v3`

**Files:**

- Create: `apps/native/app/settings/search.tsx`

**Settings:**

- Search all apps toggle
- Contact search toggle and call on tap
- Calendar search toggle
- File search toggle
- Shortcut search toggle
- Calculator toggle
- Unit converter toggle
- Wikipedia search toggle
- Website search toggle
- Location search toggle
- Search filters
- Filter bar toggle

---

### Task 11: Build Gestures Settings Page

**Required skills:** `building-native-ui`, `heroui-native`, `react-native-unistyles-v3`

**Files:**

- Create: `apps/native/app/settings/gestures.tsx`

**Settings:**

- Swipe down action (Search/Notifications/Quick Settings/etc.)
- Swipe up action
- Swipe left action
- Swipe right action
- Double tap action
- Long press action

---

### Task 12: Build Integrations Settings Page

**Required skills:** `building-native-ui`, `heroui-native`, `react-native-unistyles-v3`

**Files:**

- Create: `apps/native/app/settings/integrations.tsx`

**Settings:**

- Weather provider
- Auto location toggle
- Manual location
- Calendar provider
- Media settings
- File search providers
- Contact search providers
- Nextcloud/Owncloud integration

---

### Task 13: Build Plugins Settings Page

**Required skills:** `building-native-ui`, `react-native-unistyles-v3`, `vercel-composition-patterns`

**Files:**

- Create: `apps/native/app/settings/plugins.tsx`

**Settings:**

- Plugin list
- Plugin toggles
- Add plugin button (placeholder)

---

### Task 14: Build Locale Settings Page

**Required skills:** `building-native-ui`, `heroui-native`, `react-native-unistyles-v3`

**Files:**

- Create: `apps/native/app/settings/locale.tsx`

**Settings:**

- Time format (12h/24h/System)
- Measurement system (Metric/UK/US/System)
- Primary calendar
- Secondary calendar
- Transliterator

---

### Task 15: Build Backup Settings Page

**Required skills:** `building-native-ui`, `react-native-unistyles-v3`

**Files:**

- Create: `apps/native/app/settings/backup.tsx`

**Settings:**

- Create backup
- Restore backup
- Export settings
- Import settings

---

### Task 16: Build Debug Settings Page

**Required skills:** `building-native-ui`, `react-native-unistyles-v3`

**Files:**

- Create: `apps/native/app/settings/debug.tsx`

**Settings:**

- Debug options
- Log level
- Clear cache
- Test notifications

---

### Task 17: Build About Settings Page

**Required skills:** `building-native-ui`, `react-native-unistyles-v3`

**Files:**

- Create: `apps/native/app/settings/about.tsx`

**Settings:**

- App version
- Build number
- Licenses
- Open source licenses
- Privacy policy
- Terms of service

---

### Task 18: Update Root Layout for Settings Routes

**Required skills:** `building-native-ui`, `expo-router` (use building-native-ui references)

**Files:**

- Modify: `apps/native/app/_layout.tsx`

**Step 1: Add settings routes to Stack**

Configure all 11 settings sub-routes.

**Step 2: Ensure proper navigation**

- Header shown for settings pages
- Back button works correctly
- Presentation style matches existing settings

---

### Task 19: Validate Behavior And Regressions

**Required skills:** `vercel-react-native-skills`, `vercel-react-best-practices`, `react-native-testing`

**Step 1: Navigation verification**

Verify:

- Main settings page shows all 11 categories
- Each category navigates to its sub-page
- Back navigation works correctly
- Stack header displays properly

**Step 2: Component verification**

Verify:

- All preference types render correctly
- Switch toggles work
- Sliders drag correctly
- Select opens and selects options
- Text inputs accept input

**Step 3: Regression verification**

Verify:

- Existing app functionality unchanged
- Theme switching works
- No crashes from new settings screens
- Performance remains smooth

---

### Acceptance Criteria

- Main settings page shows 11 category items with icons
- Each category has a dedicated settings page with appropriate controls
- All 6 preference component types (Row, Switch, Slider, Checkbox, Select, Text) are implemented
- Settings persist using MMKV storage
- Navigation between settings pages works correctly
- Settings provider wraps the app correctly
- Theme resolution works from settings
- No regressions in existing app functionality
- UI matches Kvaesitso's settings organization

---

### Implementation Notes

- Mirror Kvaesitso's settings organization exactly
- Use HeroUI Native components for all preference types
- Keep settings state in a central context with MMKV persistence
- Each preference component should be reusable
- Follow existing app styling and theme tokens
- Non-functional settings can show "(coming soon)" or current values
- Do not change unrelated launcher features in this phase

### Testing

- Use agent-device to test the implementation
- Verify all navigation paths work
- Test preference component interactions
- Verify settings persist after app restart
- dev server is running in the tmux session
