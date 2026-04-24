import { memo, useEffect, useRef } from "react";
import type { TextStyle } from "react-native";
import { EnrichedTextInput } from "react-native-enriched";
import type { EnrichedTextInputInstance } from "react-native-enriched";

import { markdownToHtml } from "@/lib/markdown-to-html";

interface MarkdownMessageProps {
  text: string;
  color: string;
  linkColor: string;
  mutedColor: string;
  fontSize?: number;
}

export const MarkdownMessage = memo(function MarkdownMessage({
  text,
  color,
  linkColor,
  mutedColor,
  fontSize = 14,
}: MarkdownMessageProps) {
  const ref = useRef<EnrichedTextInputInstance | null>(null);
  const html = markdownToHtml(text);

  // EnrichedTextInput is uncontrolled; re-seed the value whenever markdown
  // changes so streaming or edits reflect in the rendered output.
  useEffect(() => {
    ref.current?.setValue(html);
  }, [html]);

  const baseStyle: TextStyle = {
    color,
    fontSize,
    lineHeight: fontSize * 1.45,
  };

  return (
    <EnrichedTextInput
      ref={ref}
      editable={false}
      autoCapitalize="none"
      defaultValue={html}
      cursorColor={linkColor}
      selectionColor={linkColor}
      style={{
        ...baseStyle,
        backgroundColor: "transparent",
        padding: 0,
      }}
      htmlStyle={{
        a: { color: linkColor },
        blockquote: { borderColor: mutedColor, color: mutedColor },
        code: {
          backgroundColor: "rgba(0,0,0,0.08)",
          color,
        },
        codeblock: {
          backgroundColor: "rgba(0,0,0,0.08)",
          color,
        },
      }}
      scrollEnabled={false}
    />
  );
});
