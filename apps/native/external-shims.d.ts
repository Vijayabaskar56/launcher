declare module "bun:test" {
  export const describe: (
    label: string,
    callback: () => void | Promise<void>
  ) => void;
  export const expect: (value: unknown) => {
    toBe: (expected: unknown) => void;
    toBeNull: () => void;
    toBeString: () => void;
    toContain: (expected: string) => void;
  };
  export const it: (
    label: string,
    callback: () => void | Promise<void>
  ) => void;
}

declare module "luxon" {
  interface LuxonDateTimeInstance {
    setLocale: (locale: string) => LuxonDateTimeInstance;
    toISO: () => string | null;
    toLocaleString: (format: unknown) => string;
  }

  interface LuxonDateTimeStatic {
    DATE_FULL: unknown;
    DATETIME_MED: unknown;
    fromJSDate: (date: Date) => LuxonDateTimeInstance;
  }

  interface LuxonDurationInstance {
    normalize: () => LuxonDurationInstance;
    shiftTo: (...units: string[]) => LuxonDurationInstance;
    toHuman: (options?: {
      listStyle?: string;
      maximumFractionDigits?: number;
      unitDisplay?: string;
    }) => string;
  }

  interface LuxonDurationStatic {
    fromMillis: (value: number) => LuxonDurationInstance;
  }

  export const DateTime: LuxonDateTimeStatic;
  export const Duration: LuxonDurationStatic;
}
