import { useMemo } from "react";

import type { EmojiSuggestion } from "@/types/enriched-search";

const EMOJIS: EmojiSuggestion[] = [
  { emoji: "😄", shortcode: "smile" },
  { emoji: "😂", shortcode: "joy" },
  { emoji: "😊", shortcode: "blush" },
  { emoji: "😍", shortcode: "heart_eyes" },
  { emoji: "🤔", shortcode: "thinking" },
  { emoji: "👍", shortcode: "thumbsup" },
  { emoji: "👎", shortcode: "thumbsdown" },
  { emoji: "👋", shortcode: "wave" },
  { emoji: "🙏", shortcode: "pray" },
  { emoji: "💪", shortcode: "muscle" },
  { emoji: "❤️", shortcode: "heart" },
  { emoji: "💔", shortcode: "broken_heart" },
  { emoji: "🔥", shortcode: "fire" },
  { emoji: "⭐", shortcode: "star" },
  { emoji: "🎉", shortcode: "tada" },
  { emoji: "🎊", shortcode: "confetti" },
  { emoji: "🚀", shortcode: "rocket" },
  { emoji: "💡", shortcode: "bulb" },
  { emoji: "✅", shortcode: "check" },
  { emoji: "❌", shortcode: "x" },
  { emoji: "⚡", shortcode: "zap" },
  { emoji: "🌟", shortcode: "sparkles" },
  { emoji: "🎯", shortcode: "dart" },
  { emoji: "🔔", shortcode: "bell" },
  { emoji: "📌", shortcode: "pin" },
  { emoji: "📝", shortcode: "memo" },
  { emoji: "📧", shortcode: "email" },
  { emoji: "📞", shortcode: "phone" },
  { emoji: "📷", shortcode: "camera" },
  { emoji: "🎵", shortcode: "music" },
  { emoji: "☀️", shortcode: "sunny" },
  { emoji: "🌧️", shortcode: "rain" },
  { emoji: "❄️", shortcode: "snow" },
  { emoji: "🌈", shortcode: "rainbow" },
  { emoji: "🍕", shortcode: "pizza" },
  { emoji: "☕", shortcode: "coffee" },
  { emoji: "🍺", shortcode: "beer" },
  { emoji: "🏠", shortcode: "house" },
  { emoji: "🚗", shortcode: "car" },
  { emoji: "✈️", shortcode: "airplane" },
  { emoji: "⏰", shortcode: "alarm" },
  { emoji: "🔒", shortcode: "lock" },
  { emoji: "🔑", shortcode: "key" },
  { emoji: "💬", shortcode: "speech" },
  { emoji: "👀", shortcode: "eyes" },
  { emoji: "😎", shortcode: "cool" },
  { emoji: "🤖", shortcode: "robot" },
  { emoji: "👻", shortcode: "ghost" },
  { emoji: "💀", shortcode: "skull" },
  { emoji: "🎃", shortcode: "pumpkin" },
];

const MAX_RESULTS = 5;

export function useEmojiSuggestions(query: string): EmojiSuggestion[] {
  return useMemo(() => {
    if (!query) {
      return EMOJIS.slice(0, MAX_RESULTS);
    }
    const q = query.toLowerCase();
    return EMOJIS.filter((e) => e.shortcode.startsWith(q)).slice(
      0,
      MAX_RESULTS
    );
  }, [query]);
}
