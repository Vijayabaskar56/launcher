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

export type BuiltinWidgetId = (typeof DEFAULT_WIDGETS)[number]["id"];

/** Widget IDs: built-in ("clock", "weather") or native ("native:12345") */
export type WidgetId = string;

export const WIDGET_LABELS: Record<string, string> = Object.fromEntries(
  DEFAULT_WIDGETS.map((w) => [w.id, w.label])
);

export const WIDGET_ICONS: Record<string, string> = {
  battery: "battery",
  calendar: "calendar",
  clock: "clock",
  music: "music",
  weather: "weather",
};

export type WidgetSize = "small" | "medium" | "large";

export interface WidgetSizeConfig {
  height: number;
}

export const WIDGET_SIZES: Record<WidgetSize, WidgetSizeConfig> = {
  large: { height: 240 },
  medium: { height: 180 },
  small: { height: 120 },
};

export interface NativeWidgetInfo {
  appWidgetId: number;
  provider: string;
  label: string;
}

export const isNativeWidgetId = (id: string): boolean =>
  id.startsWith("native:");
export const getNativeWidgetKey = (appWidgetId: number): string =>
  `native:${appWidgetId}`;

export interface WidgetConfigState {
  activeWidgetIds: WidgetId[];
  widgetOpacity: number;
  widgetOrder: WidgetId[];
  widgetSizes: Record<WidgetId, WidgetSize>;
  nativeWidgets: Record<string, NativeWidgetInfo>;
}

interface WidgetConfigContextValue {
  actions: {
    addWidget: (id: WidgetId) => void;
    addNativeWidget: (
      appWidgetId: number,
      provider: string,
      label: string
    ) => string;
    removeWidget: (id: WidgetId) => void;
    reorderWidgets: (ids: WidgetId[]) => void;
    setWidgetOpacity: (opacity: number) => void;
    setWidgetSize: (id: WidgetId, size: WidgetSize) => void;
  };
  state: WidgetConfigState;
}

const defaultState: WidgetConfigState = {
  activeWidgetIds: DEFAULT_WIDGETS.map((w) => w.id),
  nativeWidgets: {},
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

const parseWidgetSizes = (
  raw: unknown,
  defaultSizes: Record<WidgetId, WidgetSize>
): Record<WidgetId, WidgetSize> => {
  const widgetSizes = { ...defaultSizes };
  const rawSizes = (raw as Partial<WidgetConfigState>)?.widgetSizes;
  if (!rawSizes || typeof rawSizes !== "object") {
    return widgetSizes;
  }

  for (const [key, value] of Object.entries(rawSizes)) {
    if (validWidgetIds.has(key as WidgetId)) {
      const size = value as WidgetSize;
      if (size === "small" || size === "medium" || size === "large") {
        widgetSizes[key as WidgetId] = size;
      }
    }
  }

  return widgetSizes;
};

const parseNativeWidgets = (raw: unknown): Record<string, NativeWidgetInfo> => {
  const nativeWidgets: Record<string, NativeWidgetInfo> = {};
  const rawNative = (raw as Record<string, unknown>).nativeWidgets;
  if (!rawNative || typeof rawNative !== "object") {
    return nativeWidgets;
  }

  for (const [key, val] of Object.entries(
    rawNative as Record<string, unknown>
  )) {
    if (key.startsWith("native:") && val && typeof val === "object") {
      const info = val as Partial<NativeWidgetInfo>;
      if (
        typeof info.appWidgetId === "number" &&
        typeof info.provider === "string"
      ) {
        nativeWidgets[key] = {
          appWidgetId: info.appWidgetId,
          label: typeof info.label === "string" ? info.label : "",
          provider: info.provider,
        };
      }
    }
  }

  return nativeWidgets;
};

const sanitizeState = (raw: unknown): WidgetConfigState => {
  if (!raw || typeof raw !== "object") {
    return defaultState;
  }

  const rawState = raw as Partial<WidgetConfigState>;

  const isValidWidgetId = (id: unknown): id is WidgetId =>
    typeof id === "string" &&
    (validWidgetIds.has(id as BuiltinWidgetId) || id.startsWith("native:"));

  const widgetOrder = Array.isArray(rawState.widgetOrder)
    ? rawState.widgetOrder.filter(isValidWidgetId)
    : [...defaultState.widgetOrder];

  const activeWidgetIds = Array.isArray(rawState.activeWidgetIds)
    ? rawState.activeWidgetIds.filter(isValidWidgetId)
    : [...defaultState.activeWidgetIds];

  const widgetOpacity =
    typeof rawState.widgetOpacity === "number" &&
    rawState.widgetOpacity >= 0 &&
    rawState.widgetOpacity <= 1
      ? rawState.widgetOpacity
      : 1;

  const widgetSizes = parseWidgetSizes(raw, {
    battery: "medium",
    calendar: "medium",
    clock: "medium",
    music: "medium",
    weather: "medium",
  });

  const order =
    widgetOrder.length > 0 ? widgetOrder : [...defaultState.widgetOrder];
  const active =
    activeWidgetIds.length > 0
      ? activeWidgetIds
      : [...defaultState.activeWidgetIds];

  const nativeWidgets = parseNativeWidgets(raw);

  return {
    activeWidgetIds: active,
    nativeWidgets,
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

  const addNativeWidget = useCallback(
    (appWidgetId: number, provider: string, label: string): string => {
      const key = getNativeWidgetKey(appWidgetId);
      persist((current) => ({
        ...current,
        activeWidgetIds: [...current.activeWidgetIds, key],
        nativeWidgets: {
          ...current.nativeWidgets,
          [key]: { appWidgetId, label, provider },
        },
        widgetOrder: [...current.widgetOrder, key],
        widgetSizes: { ...current.widgetSizes, [key]: "large" as WidgetSize },
      }));
      return key;
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
        addNativeWidget,
        addWidget,
        removeWidget,
        reorderWidgets,
        setWidgetOpacity,
        setWidgetSize,
      },
      state,
    }),
    [
      addNativeWidget,
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
