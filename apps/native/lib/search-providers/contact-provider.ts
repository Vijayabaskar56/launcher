import * as Contacts from "expo-contacts";
import { Linking } from "react-native";

import { storage } from "@/lib/storage";
import type {
  ContactResultData,
  ProviderDeps,
  SearchProvider,
  SearchResult,
} from "@/types/search";

const PERMISSION_KEY = "contact-permission-state";

const getPermissionState = (): string =>
  storage.getString(PERMISSION_KEY) ?? "unknown";

const buildPromptResult = (): SearchResult => ({
  data: null,
  icon: "lock-closed-outline",
  iconType: "ionicon",
  id: "contact-prompt",
  onPress: async () => {
    const { status } = await Contacts.requestPermissionsAsync();
    storage.set(PERMISSION_KEY, status === "granted" ? "granted" : "denied");
  },
  score: 0.5,
  subtitle: "Requires contacts permission",
  title: "Tap to enable contact search",
  type: "contact",
});

const searchContacts = async (
  query: string,
  deps: ProviderDeps
): Promise<SearchResult[]> => {
  const { data } = await Contacts.getContactsAsync({
    fields: [
      Contacts.Fields.Name,
      Contacts.Fields.PhoneNumbers,
      Contacts.Fields.Emails,
      Contacts.Fields.Image,
    ],
    name: query,
  });

  return data.map((contact): SearchResult => {
    const phoneNumbers = (contact.phoneNumbers ?? []).map((p) => ({
      label: p.label ?? "Phone",
      number: p.number ?? "",
    }));

    const emails = (contact.emails ?? []).map((e) => ({
      email: e.email ?? "",
      label: e.label ?? "Email",
    }));

    const firstPhone = phoneNumbers[0]?.number;
    const firstEmail = emails[0]?.email;
    const hasImage = Boolean(contact.image?.uri);

    const contactData: ContactResultData = {
      contactId: contact.id ?? "",
      emails,
      imageUri: contact.image?.uri,
      phoneNumbers,
    };

    return {
      data: contactData,
      icon: hasImage
        ? (contact.image?.uri ?? "person-outline")
        : "person-outline",
      iconType: hasImage ? "uri" : "ionicon",
      id: `contact-${contact.id}`,
      onPress: () => {
        if (deps.settings.contactCallOnTap && firstPhone) {
          Linking.openURL(`tel:${firstPhone}`);
        }
      },
      score: 0.9,
      subtitle: firstPhone ?? firstEmail,
      title: contact.name ?? "Unknown",
      type: "contact",
    };
  });
};

export const contactProvider: SearchProvider = {
  minQueryLength: 2,
  requiresNetwork: false,
  search: async (query, deps) => {
    try {
      const state = getPermissionState();

      if (state === "unknown") {
        return [buildPromptResult()];
      }

      if (state === "denied") {
        return [];
      }

      return await searchContacts(query, deps);
    } catch {
      return [];
    }
  },
  tier: "instant",
  type: "contact",
};
