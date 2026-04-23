# Calendar Widget Redesign

Date: 2026-04-07

## Goal

Replace the static month-grid calendar widget with a dynamic, week-strip widget
backed by the device calendar (`expo-calendar`). Match the visual language of
the reference design: month/year header, swipeable week row, event list inside
a nested rounded card, animated selection pill, fade-out gradient.

## Architecture

### New files

- `apps/native/hooks/use-calendar-events.ts`
  Wraps `expo-calendar`. Responsibilities:
  - Permission request + status
  - Fetch events for a date range (visible week ± 1 buffer)
  - Group into `EventsByDate` keyed by `YYYY-MM-DD`
  - Pre-format `time` strings using user locale (`use-locale`)
  - Refresh on app foreground
    Returns `{ eventsByDate, hasPermission, requestPermission, loading }`.

- `apps/native/components/widgets/calendar/week-strip.tsx`
  Reanimated horizontal pager. 7 day columns per week. Three weeks rendered
  (prev | current | next), recycled on snap. Pan gesture + spring snap.
  Animated selection pill via shared `selectedX`.

- `apps/native/components/widgets/calendar/event-list.tsx`
  Fixed-height (~210px) inner card. ScrollView of event rows with
  Reanimated `FadeIn` entrances. Bottom linear-gradient fade. Empty and
  no-permission states.

### Rewritten

- `apps/native/components/widgets/calendar-widget.tsx`
  Composes header + week-strip + event-list. Owns `selectedDate`,
  `weekAnchor`. Threads through `WidgetCard` for size/opacity.

### Data shape

```ts
type CalendarEvent = {
  id: string;
  title: string;
  time: string; // pre-formatted, e.g. "10:00 - 11:00 AM" or "All day"
  startDate: Date;
};
type EventsByDate = Record<string, CalendarEvent[]>; // 'YYYY-MM-DD'
```

## Behavior

- Default selected date = today.
- "Today" chip appears in header when selectedDate ≠ today; tap → jump back.
- Swipe left/right on week strip → change week (3-week window recycled).
- Tap a day → animates selection pill, swaps event list with fade.
- Permission denied / not granted → empty state shows "Connect calendar"
  pressable that calls `requestPermission()`.
- App returns to foreground → re-fetch events.
- `small` size = header + week strip only. `medium` = full layout.

## Animations (Reanimated)

- Selection pill: shared `selectedX` with `withSpring({ stiffness: 180, damping: 22 })`.
- Week pager: shared `translateX` driven by Pan gesture; `withSpring` snap on
  release; `runOnJS` shifts anchor and resets translateX to 0 after snap.
- Event row entrance: `FadeIn.duration(300)` + small Y offset.
- "Today" chip: opacity + translateY spring.

## Out of scope (YAGNI)

- Creating events from the widget
- Multi-calendar source picker
- Month picker / jump-to-date sheet
- Large widget size
