// Minimal markdown → HTML converter targeted at react-native-enriched. The
// library does not ship with a markdown parser; its setValue() accepts either
// raw text or HTML, and only a fixed tag set is rendered: <b>, <i>, <u>, <s>,
// <code>, <codeblock>, <h1>–<h6>, <ul>, <ol>, <li>, <blockquote>, <a>. This
// converter emits exactly that tag set so output round-trips through the
// native renderer without needing a separate HTML normalization pass.

const escapeHtml = (raw: string): string =>
  raw
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;")
    .replaceAll("'", "&#39;");

const applyInline = (text: string): string => {
  let out = text;
  // Escape HTML special chars first so user-written < > don't break rendering.
  out = escapeHtml(out);
  // Inline code — handled before other inline rules to protect its contents.
  out = out.replaceAll(/`([^`\n]+)`/g, "<code>$1</code>");
  // Bold — **text** or __text__
  out = out.replaceAll(/\*\*([^*\n]+)\*\*/g, "<strong>$1</strong>");
  out = out.replaceAll(/__([^_\n]+)__/g, "<strong>$1</strong>");
  // Italic — *text* or _text_
  out = out.replaceAll(/(^|[^*])\*([^*\n]+)\*(?!\*)/g, "$1<em>$2</em>");
  out = out.replaceAll(/(^|[^_])_([^_\n]+)_(?!_)/g, "$1<em>$2</em>");
  // Links — [text](url)
  out = out.replaceAll(/\[([^\]\n]+)\]\(([^)\s]+)\)/g, '<a href="$2">$1</a>');
  return out;
};

interface ListState {
  ordered: boolean;
  items: string[];
}

export function markdownToHtml(markdown: string): string {
  if (!markdown) {
    return "";
  }

  const lines = markdown.replaceAll(/\r\n?/g, "\n").split("\n");
  const blocks: string[] = [];

  let paragraph: string[] = [];
  let list: ListState | null = null;
  let inCodeBlock = false;
  let codeBuffer: string[] = [];

  const flushParagraph = () => {
    if (paragraph.length === 0) {
      return;
    }
    const joined = paragraph.join(" ").trim();
    if (joined) {
      blocks.push(`<p>${applyInline(joined)}</p>`);
    }
    paragraph = [];
  };

  const flushList = () => {
    if (!list) {
      return;
    }
    const tag = list.ordered ? "ol" : "ul";
    const items = list.items.map((item) => `<li>${applyInline(item)}</li>`);
    blocks.push(`<${tag}>${items.join("")}</${tag}>`);
    list = null;
  };

  const flushCode = () => {
    if (codeBuffer.length === 0) {
      return;
    }
    blocks.push(`<pre><code>${escapeHtml(codeBuffer.join("\n"))}</code></pre>`);
    codeBuffer = [];
  };

  for (const rawLine of lines) {
    if (inCodeBlock) {
      if (rawLine.trim().startsWith("```")) {
        inCodeBlock = false;
        flushCode();
        continue;
      }
      codeBuffer.push(rawLine);
      continue;
    }

    if (rawLine.trim().startsWith("```")) {
      flushParagraph();
      flushList();
      inCodeBlock = true;
      continue;
    }

    if (rawLine.trim() === "") {
      flushParagraph();
      flushList();
      continue;
    }

    const headingMatch = rawLine.match(/^(#{1,6})\s+(.*)$/);
    if (headingMatch) {
      flushParagraph();
      flushList();
      const level = headingMatch[1].length;
      blocks.push(`<h${level}>${applyInline(headingMatch[2])}</h${level}>`);
      continue;
    }

    const quoteMatch = rawLine.match(/^>\s?(.*)$/);
    if (quoteMatch) {
      flushParagraph();
      flushList();
      blocks.push(`<blockquote>${applyInline(quoteMatch[1])}</blockquote>`);
      continue;
    }

    const orderedMatch = rawLine.match(/^\s*\d+\.\s+(.*)$/);
    const unorderedMatch = rawLine.match(/^\s*[-*]\s+(.*)$/);
    if (orderedMatch || unorderedMatch) {
      flushParagraph();
      const ordered = orderedMatch !== null;
      const text = (orderedMatch ?? unorderedMatch)?.[1] ?? "";
      if (!list || list.ordered !== ordered) {
        flushList();
        list = { items: [text], ordered };
      } else {
        list.items.push(text);
      }
      continue;
    }

    flushList();
    paragraph.push(rawLine.trim());
  }

  flushParagraph();
  flushList();
  if (inCodeBlock) {
    flushCode();
  }

  return blocks.join("");
}
