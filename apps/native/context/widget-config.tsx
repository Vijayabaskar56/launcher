import * as SecureStore from "expo-secure-store";
import {
  createContext,
  useCallback,
  useEffect,
  useMemo,
  useState,
} from "react";

const STORAGE_KEY = "widget-config";

export const DEFAULT_WIDGETS = [
  { id: "weather", label: "Weather" },
  { id: "clock", label: "Clock & Date" },
  { id: "calendar", label: "Calendar" },
  { id: "battery", label: "Battery" },
  { id: "music", label: "Music" },
] as const;

export type WidgetId = (typeof DEFAULT_WIDGETS)[number]["id"];

export type WidgetSize = "small" | "medium" | "large";

export interface WidgetSizeConfig {
  height: number;
  width: "half" | "full";
}

export const WIDGET_SIZES: Record<WidgetSize, WidgetSizeConfig> = {
  large: { height: 240, width: "full" },
  medium: { height: 180, width: "half" },
  small: { height: 120, width: "half" },
};

export interface WidgetConfigState {
  activeWidgetIds: WidgetId[];
  widgetOpacity: number;
  widgetOrder: WidgetId[];
  widgetSizes: Record<WidgetId, WidgetSize>;
}

interface WidgetConfigContextValue {
  actions: {
    addWidget: (id: WidgetId) => void;
    removeWidget: (id: WidgetId) => void;
    reorderWidgets: (ids: WidgetId[]) => void;
    setWidgetOpacity: (opacity: number) => void;
    setWidgetSize: (id: WidgetId, size: WidgetSize) => void;
  };
  state: WidgetConfigState;
}

const defaultState: WidgetConfigState = {
  activeWidgetIds: DEFAULT_WIDGETS.map((w) => w.id),
  widgetOpacity: 1,
  widgetOrder: DEFAULT_WIDGETS.map((w) => w.id),
  widgetSizes: {
    battery: "medium",
    calendar: "medium",
    clock: "medium",
    music: "medium",
    weather: "medium",
  },
};

const validWidgetIds = new Set<WidgetId>(DEFAULT_WIDGETS.map((w) => w.id));

const sanitizeState = (raw: unknown): WidgetConfigState => {
  if (!raw || typeof raw !== "object") {
    return defaultState;
  }

  const rawState = raw as Partial<WidgetConfigState>;

  const widgetOrder = Array.isArray(rawState.widgetOrder)
    ? rawState.widgetOrder.filter(
        (id): id is WidgetId =>
          typeof id === "string" && validWidgetIds.has(id as WidgetId)
      )
    : [...defaultState.widgetOrder];

  const activeWidgetIds = Array.isArray(rawState.activeWidgetIds)
    ? rawState.activeWidgetIds.filter(
        (id): id is WidgetId =>
          typeof id === "string" && validWidgetIds.has(id as WidgetId)
      )
    : [...defaultState.activeWidgetIds];

  const widgetOpacity =
    typeof rawState.widgetOpacity === "number" &&
    rawState.widgetOpacity >= 0 &&
    rawState.widgetOpacity <= 1
      ? rawState.widgetOpacity
      : 1;

  const widgetSizesRaw = rawState.widgetSizes;
  const widgetSizes: Record<WidgetId, WidgetSize> = {
    battery: "medium",
    calendar: "medium",
    clock: "medium",
    music: "medium",
    weather: "medium",
  };

  if (widgetSizesRaw && typeof widgetSizesRaw === "object") {
    for (const [key, value] of Object.entries(widgetSizesRaw)) {
      if (validWidgetIds.has(key as WidgetId)) {
        const size = value as WidgetSize;
        if (size === "small" || size === "medium" || size === "large") {
          widgetSizes[key as WidgetId] = size;
        }
      }
    }
  }

  const order =
    widgetOrder.length > 0 ? widgetOrder : [...defaultState.widgetOrder];
  const active =
    activeWidgetIds.length > 0
      ? activeWidgetIds
      : [...defaultState.activeWidgetIds];

  return {
    activeWidgetIds: active,
    widgetOpacity,
    widgetOrder: order,
    widgetSizes,
  };
};

const persistState = async (state: WidgetConfigState) => {
  await SecureStore.setItemAsync(STORAGE_KEY, JSON.stringify(state));
};

export const WidgetConfigContext =
  createContext<WidgetConfigContextValue | null>(null);

export const WidgetConfigProvider = ({
  children,
}: {
  children: React.ReactNode;
}) => {
  const [state, setState] = useState<WidgetConfigState>(defaultState);
  const [loaded, setLoaded] = useState(false);

  useEffect(() => {
    const load = async () => {
      try {
        const stored = await SecureStore.getItemAsync(STORAGE_KEY);
        const parsed = stored ? JSON.parse(stored) : defaultState;
        setState(sanitizeState(parsed));
      } catch {
        setState(defaultState);
      } finally {
        setLoaded(true);
      }
    };

    load();
  }, []);

  const persist = useCallback(
    (updater: (current: WidgetConfigState) => WidgetConfigState) => {
      setState((current) => {
        const next = updater(current);
        persistState(next);
        return next;
      });
    },
    []
  );

  const reorderWidgets = useCallback(
    (ids: WidgetId[]) => {
      persist((current) => ({
        ...current,
        widgetOrder: [
          ...ids,
          ...current.widgetOrder.filter((id) => !ids.includes(id)),
        ],
      }));
    },
    [persist]
  );

  const removeWidget = useCallback(
    (id: WidgetId) => {
      persist((current) => {
        const nextActive = current.activeWidgetIds.filter((wid) => wid !== id);
        if (nextActive.length === 0) {
          return current;
        }
        return { ...current, activeWidgetIds: nextActive };
      });
    },
    [persist]
  );

  const addWidget = useCallback(
    (id: WidgetId) => {
      persist((current) => ({
        ...current,
        activeWidgetIds: current.activeWidgetIds.includes(id)
          ? current.activeWidgetIds
          : [...current.activeWidgetIds, id],
      }));
    },
    [persist]
  );

  const setWidgetOpacity = useCallback(
    (opacity: number) => {
      persist((current) => ({
        ...current,
        widgetOpacity: Math.max(0, Math.min(1, opacity)),
      }));
    },
    [persist]
  );

  const setWidgetSize = useCallback(
    (id: WidgetId, size: WidgetSize) => {
      persist((current) => ({
        ...current,
        widgetSizes: { ...current.widgetSizes, [id]: size },
      }));
    },
    [persist]
  );

  const value = useMemo(
    () => ({
      actions: {
        addWidget,
        removeWidget,
        reorderWidgets,
        setWidgetOpacity,
        setWidgetSize,
      },
      state,
    }),
    [
      addWidget,
      removeWidget,
      reorderWidgets,
      setWidgetOpacity,
      setWidgetSize,
      state,
    ]
  );

  if (!loaded) {
    return null;
  }

  return <WidgetConfigContext value={value}>{children}</WidgetConfigContext>;
};
