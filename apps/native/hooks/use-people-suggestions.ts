import * as Contacts from "expo-contacts";
import { useEffect, useMemo, useState } from "react";

import type { PersonSuggestion } from "@/types/enriched-search";

const MOCK_PEOPLE: PersonSuggestion[] = [
  { id: "mock-1", name: "Alice" },
  { id: "mock-2", name: "Bob" },
  { id: "mock-3", name: "Charlie" },
  { id: "mock-4", name: "Diana" },
  { id: "mock-5", name: "Eve" },
  { id: "mock-6", name: "Frank" },
  { id: "mock-7", name: "Grace" },
  { id: "mock-8", name: "Henry" },
];

const MAX_RESULTS = 5;

export function usePeopleSuggestions(query: string): PersonSuggestion[] {
  const [contactPeople, setContactPeople] = useState<PersonSuggestion[]>([]);

  useEffect(() => {
    let cancelled = false;

    const loadContacts = async () => {
      try {
        const { status } = await Contacts.getPermissionsAsync();
        if (status !== "granted") {
          return;
        }

        const { data } = await Contacts.getContactsAsync({
          fields: [Contacts.Fields.Name, Contacts.Fields.Image],
          pageSize: 50,
        });

        if (cancelled) {
          return;
        }

        const people: PersonSuggestion[] = data
          .filter((c) => c.name)
          .map((c) => ({
            icon: c.image?.uri,
            id: c.id ?? `contact-${c.name}`,
            name: c.name ?? "Unknown",
          }));

        setContactPeople(people);
      } catch {
        // Contacts not available, use mocks
      }
    };

    loadContacts();
    return () => {
      cancelled = true;
    };
  }, []);

  const allPeople = contactPeople.length > 0 ? contactPeople : MOCK_PEOPLE;

  return useMemo(() => {
    if (!query) {
      return allPeople.slice(0, MAX_RESULTS);
    }
    const q = query.toLowerCase();
    return allPeople
      .filter((p) => p.name.toLowerCase().startsWith(q))
      .slice(0, MAX_RESULTS);
  }, [query, allPeople]);
}
