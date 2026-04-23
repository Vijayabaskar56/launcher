import * as Crypto from "expo-crypto";

import type {
  OpenClawChatHistory,
  OpenClawChatMessage,
  OpenClawChatMessageContent,
} from "@/types/openclaw";

const parseMessageContent = (
  value: unknown
): OpenClawChatMessageContent | null => {
  if (!value || typeof value !== "object") {
    return null;
  }

  const candidate = value as Partial<OpenClawChatMessageContent> & {
    content?: string;
  };
  const { base64: candidateBase64, content: candidateContent } = candidate;
  if (typeof candidate.type !== "string") {
    return null;
  }

  let base64: string | undefined;
  if (typeof candidateBase64 === "string") {
    base64 = candidateBase64;
  } else if (typeof candidateContent === "string") {
    base64 = candidateContent;
  }

  return {
    base64,
    fileName:
      typeof candidate.fileName === "string" ? candidate.fileName : undefined,
    mimeType:
      typeof candidate.mimeType === "string" ? candidate.mimeType : undefined,
    text: typeof candidate.text === "string" ? candidate.text : undefined,
    type: candidate.type,
  };
};

const buildMessageId = (
  role: string,
  timestampMs: number | undefined,
  content: OpenClawChatMessageContent[],
  index: number
): string =>
  [
    role,
    timestampMs?.toString() ?? "untimed",
    content
      .map((part) =>
        [
          part.type,
          part.text ?? "",
          part.mimeType ?? "",
          part.fileName ?? "",
          part.base64?.slice(0, 24) ?? "",
        ].join(":")
      )
      .join("|"),
    index.toString(),
  ].join("::");

export const parseOpenClawChatHistory = (
  value: string,
  sessionKey: string
): OpenClawChatHistory => {
  const payload = JSON.parse(value) as {
    messages?: {
      content?: unknown[];
      role?: string;
      timestamp?: number;
    }[];
    sessionId?: string;
    thinkingLevel?: string;
  };

  const messages: OpenClawChatMessage[] = Array.isArray(payload.messages)
    ? payload.messages.flatMap((message, index) => {
        if (typeof message.role !== "string") {
          return [];
        }

        const content = Array.isArray(message.content)
          ? message.content
              .map((part) => parseMessageContent(part))
              .filter(
                (part): part is OpenClawChatMessageContent => part !== null
              )
          : [];

        const timestampMs =
          typeof message.timestamp === "number" ? message.timestamp : undefined;

        return [
          {
            content,
            id: buildMessageId(message.role, timestampMs, content, index),
            role: message.role,
            timestampMs,
          },
        ];
      })
    : [];

  return {
    messages,
    sessionId:
      typeof payload.sessionId === "string" ? payload.sessionId : undefined,
    sessionKey,
    thinkingLevel:
      typeof payload.thinkingLevel === "string"
        ? payload.thinkingLevel
        : undefined,
  };
};

export const buildOpenClawSendParams = async (
  sessionKey: string,
  message: string
): Promise<string> =>
  JSON.stringify({
    idempotencyKey: await Crypto.randomUUID(),
    message,
    sessionKey,
  });

export const extractOpenClawMessageText = (
  message: Pick<OpenClawChatMessage, "content">
): string =>
  message.content
    .filter((part) => part.type === "text" && typeof part.text === "string")
    .map((part) => part.text?.trim() ?? "")
    .filter((part) => part.length > 0)
    .join("\n\n");
