import { Clipboard } from "react-native";
import { fetch } from "react-native-nitro-fetch";

import type {
  ProviderDeps,
  SearchProvider,
  SearchResult,
} from "@/types/search";

// --- Currency code aliases ---

const CURRENCY_ALIASES: Record<string, string> = {
  $: "USD",
  a$: "AUD",
  au$: "AUD",
  c$: "CAD",
  can$: "CAD",
  chf: "CHF",
  dollar: "USD",
  dollars: "USD",
  euro: "EUR",
  euros: "EUR",
  franc: "CHF",
  francs: "CHF",
  hk$: "HKD",
  kr: "SEK",
  nz$: "NZD",
  peso: "MXN",
  pesos: "MXN",
  pound: "GBP",
  pounds: "GBP",
  r$: "BRL",
  real: "BRL",
  ringgit: "MYR",
  rmb: "CNY",
  rs: "INR",
  ruble: "RUB",
  rubles: "RUB",
  rupee: "INR",
  rupees: "INR",
  s$: "SGD",
  won: "KRW",
  yen: "JPY",
  yuan: "CNY",
  zloty: "PLN",
  "\u00A3": "GBP",
  "\u00A5": "JPY",
  "\u20A9": "KRW",
  "\u20AC": "EUR",
  "\u20B9": "INR",
  "\u20BD": "RUB",
};

// Common ISO 4217 currency codes
const VALID_CODES = new Set([
  "AED",
  "AFN",
  "ALL",
  "AMD",
  "ANG",
  "AOA",
  "ARS",
  "AUD",
  "AWG",
  "AZN",
  "BAM",
  "BBD",
  "BDT",
  "BGN",
  "BHD",
  "BIF",
  "BMD",
  "BND",
  "BOB",
  "BRL",
  "BSD",
  "BTN",
  "BWP",
  "BYN",
  "BZD",
  "CAD",
  "CDF",
  "CHF",
  "CLP",
  "CNY",
  "COP",
  "CRC",
  "CUP",
  "CVE",
  "CZK",
  "DJF",
  "DKK",
  "DOP",
  "DZD",
  "EGP",
  "ERN",
  "ETB",
  "EUR",
  "FJD",
  "FKP",
  "GBP",
  "GEL",
  "GHS",
  "GIP",
  "GMD",
  "GNF",
  "GTQ",
  "GYD",
  "HKD",
  "HNL",
  "HRK",
  "HTG",
  "HUF",
  "IDR",
  "ILS",
  "INR",
  "IQD",
  "IRR",
  "ISK",
  "JMD",
  "JOD",
  "JPY",
  "KES",
  "KGS",
  "KHR",
  "KMF",
  "KPW",
  "KRW",
  "KWD",
  "KYD",
  "KZT",
  "LAK",
  "LBP",
  "LKR",
  "LRD",
  "LSL",
  "LYD",
  "MAD",
  "MDL",
  "MGA",
  "MKD",
  "MMK",
  "MNT",
  "MOP",
  "MRU",
  "MUR",
  "MVR",
  "MWK",
  "MXN",
  "MYR",
  "MZN",
  "NAD",
  "NGN",
  "NIO",
  "NOK",
  "NPR",
  "NZD",
  "OMR",
  "PAB",
  "PEN",
  "PGK",
  "PHP",
  "PKR",
  "PLN",
  "PYG",
  "QAR",
  "RON",
  "RSD",
  "RUB",
  "RWF",
  "SAR",
  "SBD",
  "SCR",
  "SDG",
  "SEK",
  "SGD",
  "SHP",
  "SLE",
  "SOS",
  "SRD",
  "SSP",
  "STN",
  "SVC",
  "SYP",
  "SZL",
  "THB",
  "TJS",
  "TMT",
  "TND",
  "TOP",
  "TRY",
  "TTD",
  "TWD",
  "TZS",
  "UAH",
  "UGX",
  "USD",
  "UYU",
  "UZS",
  "VES",
  "VND",
  "VUV",
  "WST",
  "XAF",
  "XCD",
  "XOF",
  "XPF",
  "YER",
  "ZAR",
  "ZMW",
  "ZWL",
]);

// --- Exchange rate cache ---

interface RateCache {
  rates: Record<string, number>;
  fetchedAt: number;
}

// Cache exchange rates for 1 hour to avoid excessive API calls
const CACHE_TTL_MS = 60 * 60 * 1000;
const rateCache = new Map<string, RateCache>();

const fetchRates = async (
  base: string
): Promise<Record<string, number> | null> => {
  const cached = rateCache.get(base);
  if (cached && Date.now() - cached.fetchedAt < CACHE_TTL_MS) {
    return cached.rates;
  }

  try {
    const response = await fetch(`https://open.er-api.com/v6/latest/${base}`);
    const data = (await response.json()) as {
      result: string;
      rates: Record<string, number>;
    };

    if (data.result !== "success") {
      return null;
    }

    rateCache.set(base, { fetchedAt: Date.now(), rates: data.rates });
    return data.rates;
  } catch {
    return null;
  }
};

// --- Pattern matching ---

// Matches: "100 USD to EUR", "50 EUR in GBP", "100 usd to eur"
const EXPLICIT_PATTERN = /^([\d,]+(?:\.\d+)?)\s+(\S+)\s+(?:to|in|>>)\s+(\S+)$/i;

// Matches: "$100 to EUR", "\u20ac50 to USD", "\u00a3200 in JPY"
const SYMBOL_PREFIX_PATTERN =
  /^([\u20AC$\u00A3\u00A5\u20A9\u20B9\u20BD])([\d,]+(?:\.\d+)?)\s+(?:to|in|>>)\s+(\S+)$/i;

const resolveCurrency = (input: string): string | null => {
  const upper = input.toUpperCase();
  if (VALID_CODES.has(upper)) {
    return upper;
  }
  const lower = input.toLowerCase();
  const alias = CURRENCY_ALIASES[lower];
  return alias ?? null;
};

const formatAmount = (amount: number, code: string): string => {
  try {
    return new Intl.NumberFormat("en-US", {
      currency: code,
      maximumFractionDigits: 2,
      minimumFractionDigits: 2,
      style: "currency",
    }).format(amount);
  } catch {
    return `${amount.toFixed(2)} ${code}`;
  }
};

// --- Provider ---

export const currencyProvider: SearchProvider = {
  minQueryLength: 6,
  requiresNetwork: true,
  async search(query: string, _deps: ProviderDeps): Promise<SearchResult[]> {
    const trimmed = query.trim();

    let amount: number;
    let fromCode: string | null;
    let toCode: string | null;

    // Try symbol-prefix pattern first: "$100 to EUR"
    const symbolMatch = SYMBOL_PREFIX_PATTERN.exec(trimmed);
    if (symbolMatch) {
      const [, symbol, rawAmount, target] = symbolMatch;
      amount = Number.parseFloat(rawAmount.replaceAll(",", ""));
      fromCode = resolveCurrency(symbol);
      toCode = resolveCurrency(target);
    } else {
      // Try explicit pattern: "100 USD to EUR"
      const explicitMatch = EXPLICIT_PATTERN.exec(trimmed);
      if (!explicitMatch) {
        return [];
      }

      const [, rawAmount, from, to] = explicitMatch;
      amount = Number.parseFloat(rawAmount.replaceAll(",", ""));
      fromCode = resolveCurrency(from);
      toCode = resolveCurrency(to);
    }

    if (!fromCode || !toCode || Number.isNaN(amount) || amount <= 0) {
      return [];
    }

    if (fromCode === toCode) {
      return [];
    }

    const rates = await fetchRates(fromCode);
    if (!rates) {
      return [];
    }

    const rate = rates[toCode];
    if (rate === undefined) {
      return [];
    }

    const converted = amount * rate;
    const formattedResult = formatAmount(converted, toCode);
    const formattedSource = formatAmount(amount, fromCode);
    const rateDisplay = `1 ${fromCode} = ${rate.toFixed(4)} ${toCode}`;

    return [
      {
        data: {
          amount,
          convertedAmount: converted,
          fromCode,
          rate,
          toCode,
        },
        icon: "cash-outline",
        iconType: "ionicon",
        id: `currency-${fromCode}-${toCode}-${amount}`,
        onPress: () => Clipboard.setString(formattedResult),
        score: 0.95,
        subtitle: `${formattedSource} = ${formattedResult}  (${rateDisplay})`,
        title: formattedResult,
        type: "currency",
      },
    ];
  },
  tier: "network",

  type: "currency",
};
