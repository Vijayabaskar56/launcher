import * as SecureStore from "expo-secure-store";
import {
  createContext,
  useCallback,
  useEffect,
  useMemo,
  useState,
} from "react";

import type { InstalledApp } from "@/context/app-list";

const sortedCopy = (arr: string[]): string[] => {
  const copy = [...arr];
  copy.sort();
  return copy;
};

const STORAGE_KEY = "drawer-metadata";

export type AppVisibility = "default" | "search-only" | "hidden";

export interface DrawerAppMetadata {
  packageName: string;
  alias?: string;
  isPinned: boolean;
  pinnedOrder?: number;
  tagIds: string[];
  visibility: AppVisibility;
}

export interface DrawerTag {
  id: string;
  label: string;
  order: number;
}

export interface DrawerMetadataState {
  seeded: boolean;
  apps: Record<string, DrawerAppMetadata>;
  tags: DrawerTag[];
}

interface DrawerMetadataContextValue {
  state: DrawerMetadataState;
  actions: {
    createTag: (label: string) => string | null;
    removeTag: (tagId: string) => void;
    reorderPinnedApps: (packageNames: string[]) => void;
    reorderTags: (tagIds: string[]) => void;
    setAlias: (packageName: string, alias: string) => void;
    setAppTags: (packageName: string, tagIds: string[]) => void;
    setPinned: (packageName: string, isPinned: boolean) => void;
    setVisibility: (packageName: string, visibility: AppVisibility) => void;
  };
}

const defaultState: DrawerMetadataState = {
  apps: {},
  seeded: false,
  tags: [],
};

const createTagId = () =>
  `tag-${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 8)}`;

const dedupeIds = (ids: string[]) => [...new Set(ids)];

const sortItems = function sortItems<T>(
  items: T[],
  compare: (left: T, right: T) => number
) {
  const nextItems = [...items];
  for (let index = 1; index < nextItems.length; index += 1) {
    const item = nextItems[index];
    let cursor = index - 1;
    while (cursor >= 0 && compare(nextItems[cursor] as T, item as T) > 0) {
      nextItems[cursor + 1] = nextItems[cursor] as T;
      cursor -= 1;
    }
    nextItems[cursor + 1] = item as T;
  }
  return nextItems;
};

const sortTagsByOrder = (tags: DrawerTag[]) =>
  sortItems(tags, (left, right) => left.order - right.order);

const sortPinnedMetadata = (apps: Record<string, DrawerAppMetadata>) =>
  sortItems(
    Object.values(apps).filter((metadata) => metadata.isPinned),
    (left, right) => {
      const leftOrder = left.pinnedOrder ?? Number.MAX_SAFE_INTEGER;
      const rightOrder = right.pinnedOrder ?? Number.MAX_SAFE_INTEGER;
      return leftOrder - rightOrder;
    }
  );

const VALID_VISIBILITIES = new Set<AppVisibility>([
  "default",
  "search-only",
  "hidden",
]);

const getDefaultMetadata = (packageName: string): DrawerAppMetadata => ({
  isPinned: false,
  packageName,
  tagIds: [],
  visibility: "default",
});

const sanitizeState = (raw: unknown): DrawerMetadataState => {
  if (!raw || typeof raw !== "object") {
    return defaultState;
  }

  const rawState = raw as Partial<DrawerMetadataState>;
  const apps = Object.fromEntries(
    Object.entries(rawState.apps ?? {}).flatMap(([key, value]) => {
      if (!value || typeof value !== "object") {
        return [];
      }

      const metadata = value as Partial<DrawerAppMetadata>;
      const tagIds = Array.isArray(metadata.tagIds)
        ? dedupeIds(
            metadata.tagIds.filter(
              (tagId): tagId is string => typeof tagId === "string"
            )
          )
        : [];

      const alias =
        typeof metadata.alias === "string" && metadata.alias.trim().length > 0
          ? metadata.alias.trim()
          : undefined;

      const visibility =
        typeof metadata.visibility === "string" &&
        VALID_VISIBILITIES.has(metadata.visibility as AppVisibility)
          ? (metadata.visibility as AppVisibility)
          : "default";

      return [
        [
          key,
          {
            alias,
            isPinned: metadata.isPinned === true,
            packageName: key,
            pinnedOrder:
              typeof metadata.pinnedOrder === "number"
                ? metadata.pinnedOrder
                : undefined,
            tagIds,
            visibility,
          } satisfies DrawerAppMetadata,
        ],
      ];
    })
  );

  const tags = Array.isArray(rawState.tags)
    ? sortItems(
        rawState.tags.flatMap((value, index) => {
          if (!value || typeof value !== "object") {
            return [];
          }

          const tag = value as Partial<DrawerTag>;
          if (typeof tag.id !== "string" || typeof tag.label !== "string") {
            return [];
          }

          const label = tag.label.trim();
          if (label.length === 0) {
            return [];
          }

          return [
            {
              id: tag.id,
              label,
              order: typeof tag.order === "number" ? tag.order : index,
            } satisfies DrawerTag,
          ];
        }),
        (left, right) => left.order - right.order
      ).map((tag, index) => ({ ...tag, order: index }))
    : [];

  const validTagIds = new Set(tags.map((tag) => tag.id));

  return {
    apps: Object.fromEntries(
      Object.entries(apps).map(([pkg, metadata]) => [
        pkg,
        {
          ...metadata,
          tagIds: metadata.tagIds.filter((tagId) => validTagIds.has(tagId)),
        },
      ])
    ),
    seeded: rawState.seeded === true,
    tags,
  };
};

// Common Android app packages for auto-pinning on first launch
const COMMON_APP_PACKAGES = [
  [
    "com.google.android.dialer",
    "com.android.dialer",
    "com.samsung.android.dialer",
  ],
  [
    "com.google.android.contacts",
    "com.android.contacts",
    "com.samsung.android.contacts",
  ],
  [
    "com.google.android.apps.messaging",
    "com.android.mms",
    "com.samsung.android.messaging",
  ],
  [
    "com.android.camera",
    "com.google.android.GoogleCamera",
    "com.samsung.android.camera",
    "com.android.camera2",
  ],
  ["com.android.chrome", "org.mozilla.firefox"],
];

const findCommonApps = (installedPackages: Set<string>): string[] => {
  const pinned: string[] = [];
  for (const candidates of COMMON_APP_PACKAGES) {
    const found = candidates.find((pkg) => installedPackages.has(pkg));
    if (found) {
      pinned.push(found);
    }
  }
  return pinned;
};

const seedState = (
  state: DrawerMetadataState,
  installedPackages: string[]
): DrawerMetadataState => {
  // Don't seed with empty list — wait for real app data
  if (installedPackages.length === 0) {
    return state;
  }

  // Skip if already seeded AND has pinned apps
  const hasPinnedApps = Object.values(state.apps).some((a) => a.isPinned);
  if (state.seeded && hasPinnedApps) {
    return state;
  }

  const installed = new Set(installedPackages);
  const commonApps = findCommonApps(installed);

  // Fill to 5 with first alphabetical installed apps
  const remaining = sortedCopy(
    installedPackages.filter((pkg) => !commonApps.includes(pkg))
  );

  const pinnedPackages = [
    ...commonApps,
    ...remaining.slice(0, Math.max(0, 5 - commonApps.length)),
  ];

  const apps = { ...state.apps };
  for (const [index, pkg] of pinnedPackages.entries()) {
    const existing = apps[pkg] ?? getDefaultMetadata(pkg);
    apps[pkg] = {
      ...existing,
      isPinned: true,
      pinnedOrder: index,
    };
  }

  return { ...state, apps, seeded: true };
};

const persistState = async (state: DrawerMetadataState) => {
  await SecureStore.setItemAsync(STORAGE_KEY, JSON.stringify(state));
};

const updateAppMetadata = (
  state: DrawerMetadataState,
  packageName: string,
  updater: (current: DrawerAppMetadata) => DrawerAppMetadata
) => ({
  ...state,
  apps: {
    ...state.apps,
    [packageName]: updater(
      state.apps[packageName] ?? getDefaultMetadata(packageName)
    ),
  },
});

export const DrawerMetadataContext =
  createContext<DrawerMetadataContextValue | null>(null);

export const DrawerMetadataProvider = ({
  children,
  installedPackages = [],
}: {
  children: React.ReactNode;
  installedPackages?: string[];
}) => {
  const [state, setState] = useState(defaultState);
  const [loaded, setLoaded] = useState(false);

  useEffect(() => {
    const load = async () => {
      try {
        const stored = await SecureStore.getItemAsync(STORAGE_KEY);
        const parsed = stored ? JSON.parse(stored) : defaultState;
        const sanitized = sanitizeState(parsed);
        const next = seedState(sanitized, installedPackages);
        setState(next);
        // Persist if seeding happened (next.seeded changed)
        if (next.seeded && (!stored || !parsed.seeded || !sanitized.seeded)) {
          await persistState(next);
        }
      } catch {
        const next = seedState(defaultState, installedPackages);
        setState(next);
        if (next.seeded) {
          await persistState(next);
        }
      } finally {
        setLoaded(true);
      }
    };

    load();
  }, [installedPackages]);

  const persist = useCallback(
    (updater: (current: DrawerMetadataState) => DrawerMetadataState) => {
      setState((current) => {
        const next = updater(current);
        persistState(next);
        return next;
      });
    },
    []
  );

  const setPinned = useCallback(
    (packageName: string, isPinned: boolean) => {
      persist((current) => {
        if (!isPinned) {
          const next = updateAppMetadata(current, packageName, (metadata) => ({
            ...metadata,
            isPinned: false,
            pinnedOrder: undefined,
          }));

          const orderedPinned = sortPinnedMetadata(next.apps).map(
            (m) => m.packageName
          );

          return {
            ...next,
            apps: Object.fromEntries(
              Object.entries(next.apps).map(([pkg, metadata]) => [
                pkg,
                metadata.isPinned
                  ? { ...metadata, pinnedOrder: orderedPinned.indexOf(pkg) }
                  : metadata,
              ])
            ),
          };
        }

        const nextOrder = sortPinnedMetadata(current.apps).length;
        return updateAppMetadata(current, packageName, (metadata) => ({
          ...metadata,
          isPinned: true,
          pinnedOrder: metadata.pinnedOrder ?? nextOrder,
        }));
      });
    },
    [persist]
  );

  const setAlias = useCallback(
    (packageName: string, alias: string) => {
      const trimmedAlias = alias.trim();
      persist((current) =>
        updateAppMetadata(current, packageName, (metadata) => ({
          ...metadata,
          alias: trimmedAlias.length > 0 ? trimmedAlias : undefined,
        }))
      );
    },
    [persist]
  );

  const setAppTags = useCallback(
    (packageName: string, tagIds: string[]) => {
      persist((current) => {
        const validTagIds = new Set(current.tags.map((tag) => tag.id));
        const nextTagIds = dedupeIds(tagIds).filter((tagId) =>
          validTagIds.has(tagId)
        );

        return updateAppMetadata(current, packageName, (metadata) => ({
          ...metadata,
          tagIds: nextTagIds,
        }));
      });
    },
    [persist]
  );

  const createTag = useCallback(
    (label: string) => {
      const trimmedLabel = label.trim();
      if (trimmedLabel.length === 0) {
        return null;
      }

      let createdTagId: string | null = null;

      persist((current) => {
        const existing = current.tags.find(
          (tag) => tag.label.toLowerCase() === trimmedLabel.toLowerCase()
        );
        if (existing) {
          createdTagId = existing.id;
          return current;
        }

        createdTagId = createTagId();

        return {
          ...current,
          tags: [
            ...current.tags,
            {
              id: createdTagId,
              label: trimmedLabel,
              order: current.tags.length,
            },
          ],
        };
      });

      return createdTagId;
    },
    [persist]
  );

  const removeTag = useCallback(
    (tagId: string) => {
      persist((current) => ({
        ...current,
        apps: Object.fromEntries(
          Object.entries(current.apps).map(([pkg, metadata]) => [
            pkg,
            {
              ...metadata,
              tagIds: metadata.tagIds.filter((id) => id !== tagId),
            },
          ])
        ),
        tags: sortTagsByOrder(
          current.tags.filter((tag) => tag.id !== tagId)
        ).map((tag, index) => ({ ...tag, order: index })),
      }));
    },
    [persist]
  );

  const reorderTags = useCallback(
    (tagIds: string[]) => {
      persist((current) => {
        const nextOrder = [
          ...dedupeIds(tagIds),
          ...current.tags
            .map((tag) => tag.id)
            .filter((tagId) => !tagIds.includes(tagId)),
        ];

        return {
          ...current,
          tags: nextOrder.flatMap((tagId, index) => {
            const tag = current.tags.find((entry) => entry.id === tagId);
            return tag ? [{ ...tag, order: index }] : [];
          }),
        };
      });
    },
    [persist]
  );

  const setVisibility = useCallback(
    (packageName: string, visibility: AppVisibility) => {
      persist((current) =>
        updateAppMetadata(current, packageName, (metadata) => ({
          ...metadata,
          visibility,
        }))
      );
    },
    [persist]
  );

  const reorderPinnedApps = useCallback(
    (packageNames: string[]) => {
      persist((current) => {
        const pinnedPkgs = sortPinnedMetadata(current.apps).map(
          (m) => m.packageName
        );
        const nextOrder = [
          ...dedupeIds(packageNames),
          ...pinnedPkgs.filter((pkg) => !packageNames.includes(pkg)),
        ];

        return {
          ...current,
          apps: Object.fromEntries(
            Object.entries(current.apps).map(([pkg, metadata]) => {
              if (!metadata.isPinned) {
                return [pkg, metadata];
              }
              return [
                pkg,
                { ...metadata, pinnedOrder: nextOrder.indexOf(pkg) },
              ];
            })
          ),
        };
      });
    },
    [persist]
  );

  const value = useMemo(
    () => ({
      actions: {
        createTag,
        removeTag,
        reorderPinnedApps,
        reorderTags,
        setAlias,
        setAppTags,
        setPinned,
        setVisibility,
      },
      state,
    }),
    [
      createTag,
      removeTag,
      reorderPinnedApps,
      reorderTags,
      setAlias,
      setAppTags,
      setPinned,
      setVisibility,
      state,
    ]
  );

  if (!loaded) {
    return null;
  }

  return (
    <DrawerMetadataContext value={value}>{children}</DrawerMetadataContext>
  );
};

export const getDisplayLabelForApp = (
  app: InstalledApp,
  state: DrawerMetadataState
) => state.apps[app.packageName]?.alias ?? app.appName;

export const getOrderedPinnedPackages = (state: DrawerMetadataState) =>
  sortPinnedMetadata(state.apps).map((metadata) => metadata.packageName);

export const getOrderedTags = (state: DrawerMetadataState) =>
  sortTagsByOrder(state.tags);
