import { Linking } from "react-native";
import { fetch } from "react-native-nitro-fetch";

import type {
  ProviderDeps,
  SearchProvider,
  SearchResult,
} from "@/types/search";

interface NominatimAddress {
  city?: string;
  town?: string;
  village?: string;
  [key: string]: string | undefined;
}

interface NominatimResult {
  place_id: number;
  display_name: string;
  lat: string;
  lon: string;
  type: string;
  address: NominatimAddress;
}

export const locationProvider: SearchProvider = {
  minQueryLength: 2,
  requiresNetwork: true,
  async search(query: string, deps: ProviderDeps): Promise<SearchResult[]> {
    try {
      let url = `https://nominatim.openstreetmap.org/search?q=${encodeURIComponent(query)}&format=json&limit=5&addressdetails=1`;

      if (deps.locationCoords) {
        const { lat, lon } = deps.locationCoords;
        url += `&viewbox=${lon - 0.5},${lat + 0.5},${lon + 0.5},${lat - 0.5}&bounded=0`;
      }

      const response = await fetch(url, {
        headers: {
          "User-Agent": "Launcher/1.0 github.com/launcher",
        },
      });
      const data = (await response.json()) as NominatimResult[];

      return data.map((item, index) => {
        const shortName =
          item.address.city ??
          item.address.town ??
          item.address.village ??
          item.display_name.split(",")[0];

        return {
          data: {
            displayName: item.display_name,
            lat: item.lat,
            lon: item.lon,
          },
          icon: "location-outline",
          iconType: "ionicon" as const,
          id: `loc-${item.place_id}`,
          onPress: () => {
            Linking.openURL(
              `geo:${item.lat},${item.lon}?q=${encodeURIComponent(item.display_name)}`
            );
          },
          score: 0.8 - index * 0.05,
          subtitle: item.display_name,
          title: shortName,
          type: "location" as const,
        };
      });
    } catch {
      return [];
    }
  },
  tier: "network",

  type: "location",
};
